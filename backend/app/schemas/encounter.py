from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, model_validator


class EncounterCreate(BaseModel):
    """Schema for registering a new clinical visit or consultation."""

    patient_id: Optional[UUID] = Field(default=None, description="UUID of the patient")
    doctor_id: Optional[UUID] = Field(default=None, description="UUID of the attending physician")
    encounter_date: Optional[datetime] = Field(default=None, description="Encounter occurrence timestamp")
    visit_date: Optional[datetime] = Field(default=None, description="Alias for encounter_date")
    encounter_type: str = Field(default="outpatient", max_length=50, description="Encounter classification")
    chief_complaint: Optional[str] = Field(default=None, description="Primary clinical concern or presenting symptoms")
    symptoms: Optional[List[Any]] = Field(default_factory=list, description="List of discrete symptoms or complaints")
    clinical_status: Optional[str] = Field(default=None, description="Encounter status")
    status: Optional[str] = Field(default="active", description="Alias for clinical_status")
    notes: Optional[str] = Field(default=None, description="Clinical summary notes")

    @model_validator(mode="after")
    def populate_encounter_fields(self):
        if not self.encounter_date:
            self.encounter_date = self.visit_date or datetime.utcnow()
        if not self.clinical_status:
            self.clinical_status = self.status or "active"
        return self


class EncounterUpdate(BaseModel):
    """Schema for updating an ongoing or completed encounter."""

    doctor_id: Optional[UUID] = Field(default=None)
    encounter_date: Optional[datetime] = Field(default=None)
    visit_date: Optional[datetime] = Field(default=None)
    encounter_type: Optional[str] = Field(default=None, max_length=50)
    chief_complaint: Optional[str] = Field(default=None)
    symptoms: Optional[List[Any]] = Field(default=None)
    clinical_status: Optional[str] = Field(default=None)
    status: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)


class EncounterResponse(BaseModel):
    """Detailed clinical encounter representation."""

    id: UUID = Field(..., description="Unique encounter UUID")
    patient_id: UUID = Field(..., description="UUID of the patient")
    doctor_id: Optional[UUID] = Field(default=None, description="UUID of the attending physician")
    encounter_date: datetime = Field(..., description="Encounter occurrence timestamp")
    visit_date: Optional[datetime] = Field(default=None, description="Display alias for encounter_date")
    encounter_type: str = Field(..., description="Classification of encounter")
    chief_complaint: Optional[str] = Field(default=None, description="Primary presenting complaint")
    symptoms: List[Any] = Field(default_factory=list, description="Documented symptoms")
    clinical_status: str = Field(default="active", description="Clinical status of encounter")
    status: Optional[str] = Field(default=None, description="Display alias for clinical_status")
    notes: Optional[str] = Field(default=None, description="Clinical encounter notes")
    created_at: datetime = Field(..., description="Encounter record creation timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Encounter record update timestamp")
    patient_name: Optional[str] = Field(default=None, description="Full name of patient for display")
    doctor_name: Optional[str] = Field(default=None, description="Full name of attending physician for display")

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def normalize_aliases(self):
        if not self.visit_date:
            self.visit_date = self.encounter_date
        if not self.status:
            self.status = self.clinical_status
        return self
