from datetime import date, datetime
from typing import Any, Dict, Optional
from uuid import UUID
import uuid as uuid_mod
from pydantic import BaseModel, ConfigDict, Field, model_validator


class PatientCreate(BaseModel):
    """Schema for creating a new patient record with universal field aliases."""

    patient_identifier: Optional[str] = Field(default=None, max_length=50, description="Unique medical record number (MRN) or ID")
    medical_record_number: Optional[str] = Field(default=None, max_length=50, description="Alias for patient_identifier")
    full_name: Optional[str] = Field(default=None, max_length=255, description="Full legal name of the patient")
    first_name: Optional[str] = Field(default=None, max_length=100, description="First name")
    last_name: Optional[str] = Field(default=None, max_length=100, description="Last name")
    date_of_birth: Any = Field(..., description="Patient date of birth (YYYY-MM-DD or DD-MM-YYYY)")
    sex: Optional[str] = Field(default=None, max_length=20, description="Biological sex / gender identity")
    gender: Optional[str] = Field(default=None, max_length=20, description="Alias for sex")
    blood_type: Optional[str] = Field(default=None, max_length=10, description="Patient blood group")
    specialty: Optional[str] = Field(default="Radiology", description="Requested department / consultation specialty")
    consultation_type: Optional[str] = Field(default="Radiology", description="Consultation type")
    contact_info: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Contact information")
    address: Optional[str] = Field(default=None, description="Residential mailing address")
    emergency_contact: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Emergency contact details")
    emergency_contact_name: Optional[str] = Field(default=None, description="Emergency contact name")
    emergency_contact_phone: Optional[str] = Field(default=None, description="Emergency contact phone")
    phone: Optional[str] = Field(default=None, description="Primary telephone")
    email: Optional[str] = Field(default=None, description="Contact email")
    user_id: Optional[UUID] = Field(default=None, description="Optional linked app_user ID")

    @model_validator(mode="after")
    def populate_defaults(self):
        if not self.full_name:
            if self.first_name or self.last_name:
                self.full_name = f"{self.first_name or ''} {self.last_name or ''}".strip()
            else:
                self.full_name = "Unknown Patient"
        if not self.patient_identifier:
            self.patient_identifier = self.medical_record_number or f"MRN-{uuid_mod.uuid4().hex[:6].upper()}"
        if not self.sex:
            self.sex = self.gender or "other"
        if self.date_of_birth:
            if isinstance(self.date_of_birth, str):
                parsed = None
                for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%m-%d-%Y", "%d/%m/%Y", "%m/%d/%Y"):
                    try:
                        parsed = datetime.strptime(self.date_of_birth.strip(), fmt).date()
                        break
                    except ValueError:
                        pass
                self.date_of_birth = parsed or date(1980, 1, 1)
        else:
            self.date_of_birth = date(1980, 1, 1)
        if not self.contact_info:
            ci = {}
            if self.phone:
                ci["phone"] = self.phone
            if self.email:
                ci["email"] = self.email
            self.contact_info = ci
        return self


class PatientUpdate(BaseModel):
    """Schema for updating an existing patient record."""

    patient_identifier: Optional[str] = Field(default=None, max_length=50)
    medical_record_number: Optional[str] = Field(default=None, max_length=50)
    full_name: Optional[str] = Field(default=None, max_length=255)
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    date_of_birth: Optional[date] = Field(default=None)
    sex: Optional[str] = Field(default=None, max_length=20)
    gender: Optional[str] = Field(default=None, max_length=20)
    contact_info: Optional[Dict[str, Any]] = Field(default=None)
    address: Optional[str] = Field(default=None)
    emergency_contact: Optional[Dict[str, Any]] = Field(default=None)
    user_id: Optional[UUID] = Field(default=None)


class PatientResponse(BaseModel):
    """Complete patient profile representation."""

    id: UUID = Field(..., description="Patient UUID")
    user_id: Optional[UUID] = Field(default=None, description="Linked app_user UUID if registered")
    patient_identifier: str = Field(..., description="Medical record / Patient identifier")
    medical_record_number: Optional[str] = Field(default=None, description="MRN display")
    full_name: str = Field(..., description="Full legal name of patient")
    first_name: Optional[str] = Field(default=None, description="First name")
    last_name: Optional[str] = Field(default=None, description="Last name")
    date_of_birth: date = Field(..., description="Date of birth")
    sex: str = Field(..., description="Patient sex")
    gender: Optional[str] = Field(default=None, description="Gender display")
    blood_type: Optional[str] = Field(default=None, description="Blood type")
    specialty: Optional[str] = Field(default="Radiology", description="Assigned clinical specialty / department")
    consultation_type: Optional[str] = Field(default="Radiology", description="Requested consultation type")
    contact_info: Dict[str, Any] = Field(default_factory=dict, description="Contact info dictionary")
    address: Optional[str] = Field(default=None, description="Residential address")
    emergency_contact: Dict[str, Any] = Field(default_factory=dict, description="Emergency contact details")
    phone: Optional[str] = Field(default=None, description="Phone")
    email: Optional[str] = Field(default=None, description="Email")
    is_active: bool = Field(default=True, description="Active status")
    created_at: datetime = Field(..., description="Record creation timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Record last update timestamp")

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def normalize_fields(self):
        if not self.medical_record_number:
            self.medical_record_number = self.patient_identifier
        if not self.gender:
            self.gender = self.sex
        if not self.first_name:
            parts = self.full_name.split(" ")
            self.first_name = parts[0]
            self.last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
        if isinstance(self.contact_info, dict):
            if not self.phone and "phone" in self.contact_info:
                self.phone = self.contact_info["phone"]
            if not self.email and "email" in self.contact_info:
                self.email = self.contact_info["email"]
            if "specialty" in self.contact_info and self.contact_info["specialty"]:
                self.specialty = self.contact_info["specialty"]
            if "consultation_type" in self.contact_info and self.contact_info["consultation_type"]:
                self.consultation_type = self.contact_info["consultation_type"]
        if not self.specialty:
            self.specialty = self.consultation_type or "Radiology"
        if not self.consultation_type:
            self.consultation_type = self.specialty or "Radiology"
        return self


class PatientDetailResponse(PatientResponse):
    """Detailed patient profile including clinical entity counts."""

    conditions_count: int = Field(default=0, description="Count of documented diagnosed conditions")
    medications_count: int = Field(default=0, description="Count of documented medications")
    allergies_count: int = Field(default=0, description="Count of documented allergies")
    encounters_count: int = Field(default=0, description="Count of total clinical encounters")


class PatientSearchParams(BaseModel):
    """Parameters for searching and filtering patient records."""

    query: Optional[str] = Field(default=None, description="Text search string matching patient name or identifier")
    sex: Optional[str] = Field(default=None, description="Filter by biological sex")
