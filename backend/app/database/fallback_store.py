import uuid as uuid_mod
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from app.schemas.patient import PatientResponse

FALLBACK_PATIENTS: Dict[str, Dict[str, Any]] = {
    "72976e9a-5202-4c20-a6c6-9e1e9098364d": {
        "id": "72976e9a-5202-4c20-a6c6-9e1e9098364d",
        "user_id": None,
        "patient_identifier": "MRN-945565",
        "medical_record_number": "MRN-945565",
        "full_name": "k l",
        "first_name": "k",
        "last_name": "l",
        "date_of_birth": "1980-05-14",
        "sex": "male",
        "gender": "male",
        "blood_type": "O+",
        "specialty": "Radiology",
        "consultation_type": "Thoracic Radiography",
        "contact_info": {
            "phone": "+1 (555) 234-5678",
            "email": "kl@patient.com",
            "blood_type": "O+",
            "specialty": "Radiology",
            "consultation_type": "Thoracic Radiography",
        },
        "address": "124 Healthcare Way, Suite 400",
        "emergency_contact": {
            "name": "Jane Doe",
            "phone": "+1 (555) 987-6543",
        },
        "phone": "+1 (555) 234-5678",
        "email": "kl@patient.com",
        "created_at": "2026-11-23T12:00:00Z",
        "updated_at": "2026-11-23T12:00:00Z",
    },
    "a0000000-0000-0000-0000-000000000004": {
        "id": "a0000000-0000-0000-0000-000000000004",
        "user_id": None,
        "patient_identifier": "PT-10021",
        "medical_record_number": "PT-10021",
        "full_name": "Sarah Johnson",
        "first_name": "Sarah",
        "last_name": "Johnson",
        "date_of_birth": "1990-08-22",
        "sex": "female",
        "gender": "female",
        "blood_type": "A+",
        "specialty": "Radiology",
        "consultation_type": "Chest Radiograph",
        "contact_info": {
            "phone": "+1 (555) 456-7890",
            "email": "sarah.j@patient.com",
            "blood_type": "A+",
            "specialty": "Radiology",
            "consultation_type": "Chest Radiograph",
        },
        "address": "742 Evergreen Terrace",
        "emergency_contact": {
            "name": "Mark Johnson",
            "phone": "+1 (555) 112-2334",
        },
        "phone": "+1 (555) 456-7890",
        "email": "sarah.j@patient.com",
        "created_at": "2026-11-23T12:00:00Z",
        "updated_at": "2026-11-23T12:00:00Z",
    },
    "a0000000-0000-0000-0000-000000000005": {
        "id": "a0000000-0000-0000-0000-000000000005",
        "user_id": None,
        "patient_identifier": "PT-10045",
        "medical_record_number": "PT-10045",
        "full_name": "Michael Chen",
        "first_name": "Michael",
        "last_name": "Chen",
        "date_of_birth": "1968-11-03",
        "sex": "male",
        "gender": "male",
        "blood_type": "B+",
        "specialty": "Radiology",
        "consultation_type": "Cardiothoracic Assessment",
        "contact_info": {
            "phone": "+1 (555) 789-0123",
            "email": "mchen@patient.com",
            "blood_type": "B+",
            "specialty": "Radiology",
            "consultation_type": "Cardiothoracic Assessment",
        },
        "address": "55 Lakeview Boulevard",
        "emergency_contact": {
            "name": "Lily Chen",
            "phone": "+1 (555) 334-4556",
        },
        "phone": "+1 (555) 789-0123",
        "email": "mchen@patient.com",
        "created_at": "2026-11-23T12:00:00Z",
        "updated_at": "2026-11-23T12:00:00Z",
    },
}

FALLBACK_DOCUMENTS: Dict[str, Dict[str, Any]] = {}


def add_document(data: dict) -> dict:
    doc_id = str(data.get("id") or uuid_mod.uuid4())
    data["id"] = doc_id
    FALLBACK_DOCUMENTS[doc_id] = data
    return data


def get_document(doc_id: str) -> Optional[dict]:
    return FALLBACK_DOCUMENTS.get(str(doc_id))


def get_documents(patient_id: Optional[str] = None) -> List[dict]:
    if patient_id:
        return [d for d in FALLBACK_DOCUMENTS.values() if str(d.get("patient_id")) == str(patient_id)]
    return list(FALLBACK_DOCUMENTS.values())


FALLBACK_MEDICATIONS: List[Dict[str, Any]] = [
    {
        "id": "176761a0-03d2-4a38-a78f-ce90c6a5c0ac",
        "patient_id": "72976e9a-5202-4c20-a6c6-9e1e9098364d",
        "patient_name": "k l",
        "patient_identifier": "MRN-945565",
        "medication_name": "aspirin",
        "dosage": "1",
        "frequency": "2",
        "route": "internal",
        "status": "active",
        "start_date": "2026-11-23 16:31:36",
        "end_date": None,
        "notes": "pain killer",
        "instructions": "pain killer",
        "created_at": "2026-11-23 16:31:36",
    },
    {
        "id": "5b20b7ed-38bb-4033-9774-4af87bef64d0",
        "patient_id": "72976e9a-5202-4c20-a6c6-9e1e9098364d",
        "patient_name": "k l",
        "patient_identifier": "MRN-945565",
        "medication_name": "Amoxicillin-Clavulanate",
        "dosage": "875/125 mg",
        "frequency": "Oral twice daily with meals",
        "route": "oral",
        "status": "active",
        "start_date": "2026-11-23 16:29:12",
        "end_date": None,
        "notes": "Complete full course. Take with meals to avoid GI upset. Return immediately if high fever or breathing distress occurs.",
        "instructions": "Complete full course. Take with meals to avoid GI upset. Return immediately if high fever or breathing distress occurs.",
        "created_at": "2026-11-23 16:29:12",
    },
]


def _to_response_obj(data: dict) -> PatientResponse:
    dob = data.get("date_of_birth")
    if isinstance(dob, str):
        try:
            dob = datetime.strptime(dob[:10], "%Y-%m-%d").date()
        except Exception:
            dob = date(1980, 1, 1)
    elif not isinstance(dob, date):
        dob = date(1980, 1, 1)

    return PatientResponse(
        id=uuid_mod.UUID(str(data["id"])),
        user_id=uuid_mod.UUID(str(data["user_id"])) if data.get("user_id") else None,
        patient_identifier=data.get("patient_identifier", f"MRN-{str(data['id'])[:6].upper()}"),
        medical_record_number=data.get("medical_record_number") or data.get("patient_identifier"),
        full_name=data.get("full_name", "Patient"),
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        date_of_birth=dob,
        sex=data.get("sex", "other"),
        gender=data.get("gender") or data.get("sex"),
        blood_type=data.get("blood_type"),
        specialty=data.get("specialty", "Radiology"),
        consultation_type=data.get("consultation_type", "Radiology"),
        contact_info=data.get("contact_info") or {},
        address=data.get("address"),
        emergency_contact=data.get("emergency_contact") or {},
        phone=data.get("phone"),
        email=data.get("email"),
        is_active=True,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )


def list_patients(search: Optional[str] = None, specialty: Optional[str] = None, page: int = 1, page_size: int = 20) -> dict:
    all_patients = list(FALLBACK_PATIENTS.values())
    if search:
        q = search.lower().strip()
        all_patients = [
            p for p in all_patients
            if q in p.get("full_name", "").lower() or q in p.get("patient_identifier", "").lower()
        ]
    if specialty and specialty.lower() != "all":
        s = specialty.lower()
        all_patients = [
            p for p in all_patients
            if s in p.get("specialty", "").lower() or s in p.get("consultation_type", "").lower()
        ]

    offset = (page - 1) * page_size
    slice_patients = all_patients[offset:offset + page_size]
    items = [_to_response_obj(p) for p in slice_patients]
    total = len(all_patients)

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
    }


def get_patient(patient_id: str) -> Optional[PatientResponse]:
    p = FALLBACK_PATIENTS.get(str(patient_id))
    if not p:
        return None
    return _to_response_obj(p)


def add_patient(data: dict) -> PatientResponse:
    p_id = str(data.get("id") or uuid_mod.uuid4())
    data["id"] = p_id
    if not data.get("patient_identifier"):
        data["patient_identifier"] = f"MRN-{uuid_mod.uuid4().hex[:6].upper()}"
    FALLBACK_PATIENTS[p_id] = data
    return _to_response_obj(data)


def get_medications(patient_id: Optional[str] = None) -> List[dict]:
    if patient_id:
        return [m for m in FALLBACK_MEDICATIONS if str(m.get("patient_id")) == str(patient_id)]
    return list(FALLBACK_MEDICATIONS)


def add_medication(data: dict) -> dict:
    med_id = str(data.get("id") or uuid_mod.uuid4())
    data["id"] = med_id
    if not data.get("created_at"):
        data["created_at"] = str(datetime.now())
    
    # Enrich with patient name and MRN if missing
    p_id = str(data.get("patient_id"))
    if p_id in FALLBACK_PATIENTS:
        pat = FALLBACK_PATIENTS[p_id]
        if not data.get("patient_name"):
            data["patient_name"] = pat.get("full_name", "Patient")
        if not data.get("patient_identifier"):
            data["patient_identifier"] = pat.get("patient_identifier", "")
            
    FALLBACK_MEDICATIONS.insert(0, data)
    return data


FALLBACK_REPORTS: List[Dict[str, Any]] = []


def get_reports(patient_id: Optional[str] = None) -> List[dict]:
    if patient_id:
        return [r for r in FALLBACK_REPORTS if str(r.get("patient_id")) == str(patient_id)]
    return list(FALLBACK_REPORTS)


def add_report(data: dict) -> dict:
    rep_id = str(data.get("id") or uuid_mod.uuid4())
    data["id"] = rep_id
    if not data.get("created_at"):
        data["created_at"] = str(datetime.now())
    FALLBACK_REPORTS.insert(0, data)
    return data
