import json
import os
import uuid as uuid_mod
from datetime import date, datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from app.schemas.patient import PatientResponse

STORE_DIR = Path("./logs")
STORE_FILE = STORE_DIR / "clinic_store.json"

# In-memory stores initialized empty as requested (clean slate)
FALLBACK_PATIENTS: Dict[str, Dict[str, Any]] = {}
FALLBACK_DOCUMENTS: Dict[str, Dict[str, Any]] = {}
FALLBACK_MEDICATIONS: List[Dict[str, Any]] = []
FALLBACK_REPORTS: List[Dict[str, Any]] = []


def _save_to_disk():
    """Persist clinic patient and clinical interactions to disk."""
    try:
        STORE_DIR.mkdir(parents=True, exist_ok=True)
        payload = {
            "patients": FALLBACK_PATIENTS,
            "documents": FALLBACK_DOCUMENTS,
            "medications": FALLBACK_MEDICATIONS,
            "reports": FALLBACK_REPORTS,
        }
        with open(STORE_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, default=str, indent=2)
    except Exception as e:
        pass


def _load_from_disk():
    """Load previously registered patients and interactions from disk."""
    global FALLBACK_PATIENTS, FALLBACK_DOCUMENTS, FALLBACK_MEDICATIONS, FALLBACK_REPORTS
    if STORE_FILE.exists():
        try:
            with open(STORE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                FALLBACK_PATIENTS = data.get("patients", {})
                FALLBACK_DOCUMENTS = data.get("documents", {})
                FALLBACK_MEDICATIONS = data.get("medications", [])
                FALLBACK_REPORTS = data.get("reports", [])
        except Exception:
            pass


# Load persistent store if present
_load_from_disk()


def clear_all_patient_data():
    """Completely empty patient and interaction data."""
    global FALLBACK_PATIENTS, FALLBACK_DOCUMENTS, FALLBACK_MEDICATIONS, FALLBACK_REPORTS
    FALLBACK_PATIENTS = {}
    FALLBACK_DOCUMENTS = {}
    FALLBACK_MEDICATIONS = []
    FALLBACK_REPORTS = []
    _save_to_disk()


def add_document(data: dict) -> dict:
    doc_id = str(data.get("id") or uuid_mod.uuid4())
    data["id"] = doc_id
    FALLBACK_DOCUMENTS[doc_id] = data
    _save_to_disk()
    return data


def get_document(doc_id: str) -> Optional[dict]:
    return FALLBACK_DOCUMENTS.get(str(doc_id))


def get_documents(patient_id: Optional[str] = None) -> List[dict]:
    if patient_id:
        return [d for d in FALLBACK_DOCUMENTS.values() if str(d.get("patient_id")) == str(patient_id)]
    return list(FALLBACK_DOCUMENTS.values())


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
    _save_to_disk()
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
    _save_to_disk()
    return data


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
    _save_to_disk()
    return data
