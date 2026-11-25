from uuid import UUID
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.dependencies.auth import get_current_user
from app.database.repositories.report_repo import ReportRepository
from app.schemas.report import ReportUpdateRequest, ReviewCreate

router = APIRouter()


@router.get("/{report_id}")
async def get_report(report_id: UUID, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    repo = ReportRepository(db)
    report = await repo.get_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    reviews = await repo.get_reviews(report_id)

    struct = report.structured_report or {}
    sections = {}
    if struct.get("agent_sections"):
        for sec in struct["agent_sections"]:
            sections[sec.get("agent", "agent")] = sec.get("data", {})
    if struct.get("patient_history_summary"):
        sections["patient_history"] = {"summary": struct["patient_history_summary"]}
    if struct.get("prescriptions"):
        sections["prescriptions"] = struct["prescriptions"]

    return {
        "id": str(report.id),
        "patient_id": str(report.patient_id),
        "encounter_id": str(report.encounter_id) if report.encounter_id else None,
        "workflow_id": str(report.workflow_id) if report.workflow_id else None,
        "report_version": report.report_version,
        "report_content": report.report_content,
        "structured_report": report.structured_report,
        "status": report.status,
        "title": struct.get("title") or f"Clinical Decision Support Report",
        "summary": struct.get("impression") or report.report_content or "Clinical evaluation completed.",
        "impression": struct.get("impression") or "Clinical evaluation completed.",
        "patient_history_summary": struct.get("patient_history_summary", ""),
        "prescriptions": struct.get("prescriptions", []),
        "findings": struct.get("findings", []),
        "sections": sections,
        "findings_count": len(struct.get("findings", [])),
        "critical_findings_count": 0,
        "is_demo_mode": struct.get("is_demo", False),
        "sent_to_patient": struct.get("sent_to_patient", True),
        "generated_at": str(report.generated_at),
        "created_at": str(report.generated_at),
        "updated_at": str(report.updated_at) if report.updated_at else None,
        "reviews": [{
            "id": str(r.id), "doctor_id": str(r.doctor_id), "review_status": r.review_status,
            "comments": r.comments, "reviewed_at": str(r.reviewed_at) if r.reviewed_at else None,
        } for r in reviews],
    }


@router.get("")
@router.get("/")
async def list_reports_query(patient_id: Optional[UUID] = None, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    repo = ReportRepository(db)
    if patient_id:
        reports = await repo.list_for_patient(patient_id)
    else:
        from app.database.models.report import ClinicalReport
        from sqlalchemy import select
        res = await db.execute(select(ClinicalReport).order_by(ClinicalReport.generated_at.desc()).limit(100))
        reports = list(res.scalars().all())

    items = []
    for r in reports:
        st = r.structured_report or {}
        items.append({
            "id": str(r.id),
            "patient_id": str(r.patient_id),
            "report_version": r.report_version,
            "status": r.status,
            "title": st.get("title") or "Clinical Diagnostic Report",
            "report_content": r.report_content,
            "summary": st.get("impression") or r.report_content,
            "impression": st.get("impression"),
            "patient_history_summary": st.get("patient_history_summary", ""),
            "prescriptions": st.get("prescriptions", []),
            "structured_report": r.structured_report,
            "is_demo_mode": st.get("is_demo", False),
            "sent_to_patient": st.get("sent_to_patient", True),
            "generated_at": str(r.generated_at),
            "created_at": str(r.generated_at),
            "encounter_id": str(r.encounter_id) if r.encounter_id else None,
        })

    # Include fallback reports
    from app.database import fallback_store
    for fr in fallback_store.get_reports(str(patient_id) if patient_id else None):
        if not any(it["id"] == str(fr.get("id")) for it in items):
            st = fr.get("structured_report") or {}
            items.append({
                "id": str(fr.get("id")),
                "patient_id": str(fr.get("patient_id")),
                "report_version": 1,
                "status": "completed",
                "title": st.get("title") or fr.get("title") or "Clinical Diagnostic Report",
                "report_content": fr.get("report_content", ""),
                "summary": st.get("impression") or fr.get("report_content", "Clinical review completed."),
                "impression": st.get("impression"),
                "patient_history_summary": st.get("patient_history_summary", ""),
                "prescriptions": st.get("prescriptions", []),
                "structured_report": fr.get("structured_report"),
                "is_demo_mode": False,
                "sent_to_patient": True,
                "generated_at": str(fr.get("created_at")),
                "created_at": str(fr.get("created_at")),
                "encounter_id": str(fr.get("encounter_id", "")),
            })

    return {"items": items}


@router.get("/patient/{patient_id}")
async def list_reports(patient_id: UUID, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    repo = ReportRepository(db)
    reports = await repo.list_for_patient(patient_id)
    return {"items": [{
        "id": str(r.id),
        "report_version": r.report_version,
        "status": r.status,
        "report_content": r.report_content,
        "structured_report": r.structured_report,
        "generated_at": str(r.generated_at),
        "encounter_id": str(r.encounter_id) if r.encounter_id else None,
    } for r in reports]}


@router.post("/{report_id}/send-to-patient")
async def send_report_to_patient(report_id: UUID, body: dict = None, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    repo = ReportRepository(db)
    report = await repo.get_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    body = body or {}
    struct = dict(report.structured_report or {})
    struct["sent_to_patient"] = True
    struct["sent_at"] = datetime.now(timezone.utc).isoformat()
    if body.get("doctor_notes"):
        struct["doctor_notes"] = body["doctor_notes"]
    if body.get("prescriptions"):
        struct["prescriptions"] = body["prescriptions"]

    await repo.update(report_id, status="finalized", structured_report=struct)

    # If prescriptions were included, sync them into the patient's active medications
    if body.get("prescriptions") and isinstance(body["prescriptions"], list):
        from app.database.repositories.clinical_repo import MedicationRepository
        med_repo = MedicationRepository(db)
        for rx in body["prescriptions"]:
            if isinstance(rx, dict) and rx.get("medication_name"):
                try:
                    await med_repo.create(
                        patient_id=report.patient_id,
                        medication_name=rx["medication_name"],
                        dosage=rx.get("dosage", "As directed"),
                        frequency=rx.get("frequency", "Daily"),
                        status="active",
                        notes=rx.get("instructions", "Prescribed via AI Clinical Decision Support"),
                    )
                except Exception as ex:
                    logger.warning(f"Could not sync medication to table: {ex}")

    await db.commit()
    return {"message": "Report and prescriptions successfully synced to patient dashboard", "status": "finalized"}


@router.put("/{report_id}")
async def update_report(report_id: UUID, body: ReportUpdateRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    repo = ReportRepository(db)
    report = await repo.update(report_id, **body.model_dump(exclude_unset=True))
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.commit()
    return {"message": "Report updated"}


@router.post("/{report_id}/reviews", status_code=201)
async def submit_review(report_id: UUID, body: ReviewCreate, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    repo = ReportRepository(db)
    report = await repo.get_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    doctor_id = user.get("doctor_id")
    if not doctor_id:
        raise HTTPException(status_code=403, detail="Only doctors can review reports")
    review = await repo.create_review(
        report_id=report_id, doctor_id=doctor_id,
        review_status=body.review_status, comments=body.comments,
        reviewed_at=datetime.now(timezone.utc),
    )
    if body.review_status == "approved":
        await repo.update(report_id, status="finalized")
    elif body.review_status == "needs_revision":
        await repo.update(report_id, status="in_review")
    await db.commit()
    return {"review_id": str(review.id), "status": body.review_status}


@router.get("/{report_id}/reviews")
async def get_reviews(report_id: UUID, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    repo = ReportRepository(db)
    reviews = await repo.get_reviews(report_id)
    return {"items": [{
        "id": str(r.id), "review_status": r.review_status, "comments": r.comments,
        "reviewed_at": str(r.reviewed_at) if r.reviewed_at else None,
    } for r in reviews]}
