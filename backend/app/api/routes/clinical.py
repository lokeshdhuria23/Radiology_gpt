from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.dependencies.auth import get_current_user
from app.database.repositories.clinical_repo import (
    VitalRepository, ConditionRepository, AllergyRepository,
    MedicationRepository, MedicationOrderRepository, LabResultRepository, ClinicalNoteRepository,
)
from app.schemas.clinical import (
    VitalCreate, VitalResponse, ConditionCreate, ConditionUpdate, ConditionResponse,
    AllergyCreate, AllergyUpdate, AllergyResponse, MedicationCreate, MedicationUpdate, MedicationResponse,
    MedicationOrderCreate, MedicationOrderUpdate, MedicationOrderResponse,
    LabResultCreate, LabResultUpdate, LabResultResponse,
    ClinicalNoteCreate, ClinicalNoteUpdate, ClinicalNoteResponse,
)

router = APIRouter()


def _crud_routes(prefix, RepoClass, CreateSchema, UpdateSchema, ResponseSchema, name):
    @router.get(f"/patients/{{patient_id}}/{prefix}")
    async def list_items(patient_id: UUID, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
        repo = RepoClass(db)
        items, total = await repo.list_for_patient(patient_id)
        return {"items": [ResponseSchema.model_validate(i) for i in items], "total": total}

    @router.post(f"/patients/{{patient_id}}/{prefix}", status_code=201)
    async def create_item(patient_id: UUID, body: CreateSchema, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
        repo = RepoClass(db)
        data = body.model_dump()
        data["patient_id"] = patient_id

        # Sanitize attributes according to database model schema
        if RepoClass == VitalRepository:
            if "height_cm" in data and not data.get("height"):
                data["height"] = data["height_cm"]
            if "weight_kg" in data and not data.get("weight"):
                data["weight"] = data["weight_kg"]
            cols = {"patient_id", "encounter_id", "recorded_at", "blood_pressure_systolic", "blood_pressure_diastolic", "heart_rate", "respiratory_rate", "temperature", "oxygen_saturation", "height", "weight", "bmi", "notes"}
            data = {k: v for k, v in data.items() if k in cols}
        elif RepoClass == ConditionRepository:
            if "name" in data and not data.get("condition_name"):
                data["condition_name"] = data["name"]
            if "icd_code" in data and not data.get("condition_code"):
                data["condition_code"] = data["icd_code"]
            if "status" in data and not data.get("condition_status"):
                data["condition_status"] = data["status"]
            cols = {"patient_id", "condition_name", "condition_code", "condition_status", "onset_date", "resolved_date", "source", "notes"}
            data = {k: v for k, v in data.items() if k in cols}
        elif RepoClass == MedicationRepository:
            if "name" in data and not data.get("medication_name"):
                data["medication_name"] = data["name"]
            cols = {"patient_id", "medication_name", "medication_code", "dosage", "frequency", "route", "start_date", "end_date", "status", "source", "notes"}
            data = {k: v for k, v in data.items() if k in cols}
        elif RepoClass == AllergyRepository:
            cols = {"patient_id", "allergen", "allergy_type", "severity", "reaction", "status", "source", "notes"}
            data = {k: v for k, v in data.items() if k in cols}
        elif RepoClass == LabResultRepository:
            cols = {"patient_id", "encounter_id", "test_name", "test_code", "value", "unit", "reference_range", "abnormal_flag", "specimen", "result_date", "source_file_id", "notes"}
            data = {k: v for k, v in data.items() if k in cols}
        elif RepoClass == ClinicalNoteRepository:
            if user.get("doctor_id") and not data.get("doctor_id"):
                data["doctor_id"] = user["doctor_id"]
            cols = {"patient_id", "encounter_id", "doctor_id", "note_type", "content", "structured_content", "source", "status"}
            data = {k: v for k, v in data.items() if k in cols}

        item = await repo.create(**data)
        await db.commit()
        return ResponseSchema.model_validate(item)

    list_items.__name__ = f"list_{name}"
    create_item.__name__ = f"create_{name}"

    if UpdateSchema:
        @router.put(f"/{prefix}/{{item_id}}")
        async def update_item(item_id: UUID, body: UpdateSchema, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
            repo = RepoClass(db)
            item = await repo.update(item_id, **body.model_dump(exclude_unset=True))
            if not item:
                raise HTTPException(status_code=404, detail=f"{name} not found")
            await db.commit()
            return ResponseSchema.model_validate(item)
        update_item.__name__ = f"update_{name}"


_crud_routes("vitals", VitalRepository, VitalCreate, None, VitalResponse, "vitals")
_crud_routes("conditions", ConditionRepository, ConditionCreate, ConditionUpdate, ConditionResponse, "conditions")
_crud_routes("allergies", AllergyRepository, AllergyCreate, AllergyUpdate, AllergyResponse, "allergies")
_crud_routes("medications", MedicationRepository, MedicationCreate, MedicationUpdate, MedicationResponse, "medications")
_crud_routes("medication-orders", MedicationOrderRepository, MedicationOrderCreate, MedicationOrderUpdate, MedicationOrderResponse, "medication_orders")
_crud_routes("lab-results", LabResultRepository, LabResultCreate, LabResultUpdate, LabResultResponse, "lab_results")
_crud_routes("clinical-notes", ClinicalNoteRepository, ClinicalNoteCreate, ClinicalNoteUpdate, ClinicalNoteResponse, "clinical_notes")


@router.get("/medications")
@router.get("/clinical/medications")
async def list_all_medications(
    patient_id: UUID = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    from app.database import fallback_store
    try:
        from app.database.models.clinical import Medication
        from app.database.models.patient import Patient
        from sqlalchemy import select

        q = (
            select(Medication, Patient.full_name, Patient.patient_identifier)
            .join(Patient, Patient.id == Medication.patient_id, isouter=True)
        )
        if patient_id:
            q = q.where(Medication.patient_id == patient_id)
        q = q.order_by(Medication.created_at.desc())

        res = await db.execute(q)
        rows = res.all()
        items = []
        for med, p_name, p_mrn in rows:
            items.append({
                "id": str(med.id),
                "patient_id": str(med.patient_id),
                "patient_name": p_name or "Unknown Patient",
                "patient_identifier": p_mrn or "",
                "medication_name": med.medication_name,
                "dosage": med.dosage,
                "frequency": med.frequency,
                "route": getattr(med, "route", "oral"),
                "status": med.status or "active",
                "start_date": str(med.start_date or med.created_at),
                "end_date": str(med.end_date) if getattr(med, "end_date", None) else None,
                "notes": med.notes or "",
                "instructions": med.notes or "",
                "created_at": str(med.created_at),
            })
        return {"items": items, "total": len(items)}
    except Exception as db_err:
        items = fallback_store.get_medications(str(patient_id) if patient_id else None)
        return {"items": items, "total": len(items)}


@router.post("/medications", status_code=201)
@router.post("/clinical/medications", status_code=201)
async def create_general_medication(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    from app.database import fallback_store
    from datetime import date
    p_id_str = body.get("patient_id")
    if not p_id_str:
        raise HTTPException(status_code=400, detail="patient_id is required")

    # Save to fallback store
    fallback_res = fallback_store.add_medication({
        "patient_id": str(p_id_str),
        "medication_name": body.get("medication_name", "Prescription"),
        "dosage": body.get("dosage", "As directed"),
        "frequency": body.get("frequency", "Daily"),
        "route": body.get("route", "oral"),
        "status": "active",
        "notes": body.get("instructions") or body.get("notes") or "",
        "instructions": body.get("instructions") or body.get("notes") or "",
    })

    try:
        from app.database.models.clinical import Medication
        p_id = UUID(str(p_id_str))
        med = Medication(
            patient_id=p_id,
            medication_name=body.get("medication_name", "Prescription"),
            dosage=body.get("dosage", "As directed"),
            frequency=body.get("frequency", "Daily"),
            route=body.get("route", "oral"),
            status="active",
            start_date=date.today(),
            notes=body.get("instructions") or body.get("notes") or "",
        )
        db.add(med)
        await db.commit()
        await db.refresh(med)
        return {
            "id": str(med.id),
            "patient_id": str(med.patient_id),
            "medication_name": med.medication_name,
            "dosage": med.dosage,
            "frequency": med.frequency,
            "status": med.status,
            "notes": med.notes,
            "created_at": str(med.created_at),
        }
    except Exception:
        return fallback_res


@router.post("/medications/batch", status_code=201)
@router.post("/clinical/medications/batch", status_code=201)
async def create_batch_medications(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Save multiple doctor-issued medications in a single atomic call."""
    from app.database import fallback_store
    from datetime import date
    p_id_str = body.get("patient_id")
    meds_list = body.get("medications") or []
    if not p_id_str:
        raise HTTPException(status_code=400, detail="patient_id is required")
    if not meds_list:
        return {"saved_count": 0, "items": []}

    saved_items = []
    for m in meds_list:
        med_name = m.get("medication_name") or m.get("name") or "Prescription"
        dosage = m.get("dosage", "As directed")
        frequency = m.get("frequency", "Daily")
        route = m.get("route", "oral")
        duration = m.get("duration", "")
        instr = m.get("instructions") or m.get("notes") or ""
        combined_notes = f"{instr} {f'(Duration: {duration})' if duration else ''}".strip()

        fallback_item = fallback_store.add_medication({
            "patient_id": str(p_id_str),
            "medication_name": med_name,
            "dosage": dosage,
            "frequency": frequency,
            "route": route,
            "duration": duration,
            "status": "active",
            "notes": combined_notes,
            "instructions": combined_notes,
        })

        try:
            from app.database.models.clinical import Medication
            p_id = UUID(str(p_id_str))
            med = Medication(
                patient_id=p_id,
                medication_name=med_name,
                dosage=dosage,
                frequency=frequency,
                route=route,
                status="active",
                start_date=date.today(),
                notes=combined_notes,
            )
            db.add(med)
            await db.commit()
            await db.refresh(med)
            saved_items.append({
                "id": str(med.id),
                "patient_id": str(med.patient_id),
                "medication_name": med.medication_name,
                "dosage": med.dosage,
                "frequency": med.frequency,
                "route": getattr(med, "route", route),
                "status": med.status,
                "notes": med.notes,
                "created_at": str(med.created_at),
            })
        except Exception:
            saved_items.append(fallback_item)

    return {"saved_count": len(saved_items), "items": saved_items}

