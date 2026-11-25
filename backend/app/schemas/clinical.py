from datetime import date, datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, model_validator


# -----------------------------------------------------------------------------
# 1. Vitals
# -----------------------------------------------------------------------------
class VitalCreate(BaseModel):
    """Schema for recording vital physiological signs."""

    patient_id: Optional[UUID] = Field(default=None, description="UUID of patient")
    encounter_id: Optional[UUID] = Field(default=None, description="Linked clinical encounter UUID")
    recorded_at: datetime = Field(default_factory=datetime.utcnow, description="Measurement timestamp")
    blood_pressure_systolic: Optional[int] = Field(default=None, ge=40, le=300, description="Systolic blood pressure (mmHg)")
    blood_pressure_diastolic: Optional[int] = Field(default=None, ge=20, le=200, description="Diastolic blood pressure (mmHg)")
    heart_rate: Optional[int] = Field(default=None, ge=20, le=300, description="Heart rate (bpm)")
    respiratory_rate: Optional[int] = Field(default=None, ge=4, le=100, description="Respiratory rate (bpm)")
    temperature: Optional[float] = Field(default=None, ge=25.0, le=45.0, description="Body temperature in Celsius")
    oxygen_saturation: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="SpO2 percentage")
    height: Optional[float] = Field(default=None, ge=10.0, le=300.0, description="Height in centimeters")
    height_cm: Optional[float] = Field(default=None, description="Alias for height")
    weight: Optional[float] = Field(default=None, ge=1.0, le=500.0, description="Weight in kilograms")
    weight_kg: Optional[float] = Field(default=None, description="Alias for weight")
    bmi: Optional[float] = Field(default=None, ge=5.0, le=100.0, description="Body Mass Index (kg/m²)")
    notes: Optional[str] = Field(default=None, description="Observations or measurement context")

    @model_validator(mode="after")
    def populate_vital_aliases(self):
        if self.height is None and self.height_cm is not None:
            self.height = self.height_cm
        if self.weight is None and self.weight_kg is not None:
            self.weight = self.weight_kg
        return self


class VitalResponse(BaseModel):
    """Vital signs observation record."""

    id: UUID = Field(..., description="Unique vitals record UUID")
    patient_id: UUID = Field(..., description="UUID of patient")
    encounter_id: Optional[UUID] = Field(default=None, description="Linked encounter UUID")
    recorded_at: datetime = Field(..., description="Measurement timestamp")
    blood_pressure_systolic: Optional[int] = Field(default=None, description="Systolic BP (mmHg)")
    blood_pressure_diastolic: Optional[int] = Field(default=None, description="Diastolic BP (mmHg)")
    heart_rate: Optional[int] = Field(default=None, description="Heart rate (bpm)")
    respiratory_rate: Optional[int] = Field(default=None, description="Respiratory rate (bpm)")
    temperature: Optional[float] = Field(default=None, description="Temperature (°C)")
    oxygen_saturation: Optional[float] = Field(default=None, description="SpO2 (%)")
    height: Optional[float] = Field(default=None, description="Height (cm)")
    height_cm: Optional[float] = Field(default=None, description="Display alias for height")
    weight: Optional[float] = Field(default=None, description="Weight (kg)")
    weight_kg: Optional[float] = Field(default=None, description="Display alias for weight")
    bmi: Optional[float] = Field(default=None, description="BMI (kg/m²)")
    notes: Optional[str] = Field(default=None, description="Measurement notes")
    created_at: datetime = Field(..., description="Record creation timestamp")

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def populate_response_aliases(self):
        if not self.height_cm and self.height:
            self.height_cm = self.height
        if not self.weight_kg and self.weight:
            self.weight_kg = self.weight
        return self


# -----------------------------------------------------------------------------
# 2. Conditions (Problem List)
# -----------------------------------------------------------------------------
class ConditionCreate(BaseModel):
    """Schema for documenting a diagnosed medical condition."""

    patient_id: Optional[UUID] = Field(default=None, description="UUID of patient")
    condition_name: Optional[str] = Field(default=None, max_length=255, description="Diagnosis or problem name")
    name: Optional[str] = Field(default=None, max_length=255, description="Alias for condition_name")
    condition_code: Optional[str] = Field(default=None, max_length=50, description="ICD-10 or SNOMED-CT code")
    icd_code: Optional[str] = Field(default=None, max_length=50, description="Alias for condition_code")
    condition_status: Optional[str] = Field(default="active", description="Status")
    status: Optional[str] = Field(default=None, description="Alias for condition_status")
    severity: Optional[str] = Field(default=None, description="Severity: mild, moderate, severe")
    onset_date: Optional[date] = Field(default=None, description="Date condition was first recognized")
    resolved_date: Optional[date] = Field(default=None, description="Date condition resolved if applicable")
    source: Optional[str] = Field(default=None, max_length=100, description="Source of diagnosis")
    notes: Optional[str] = Field(default=None, description="Clinical problem details")

    @model_validator(mode="after")
    def populate_condition_fields(self):
        if not self.condition_name:
            self.condition_name = self.name or "Medical Condition"
        if not self.condition_code and self.icd_code:
            self.condition_code = self.icd_code
        if not self.condition_status and self.status:
            self.condition_status = self.status
        return self


class ConditionUpdate(BaseModel):
    """Schema for updating an existing medical condition."""

    condition_name: Optional[str] = Field(default=None, max_length=255)
    name: Optional[str] = Field(default=None, max_length=255)
    condition_code: Optional[str] = Field(default=None, max_length=50)
    icd_code: Optional[str] = Field(default=None, max_length=50)
    condition_status: Optional[str] = Field(default=None)
    status: Optional[str] = Field(default=None)
    severity: Optional[str] = Field(default=None)
    onset_date: Optional[date] = None
    resolved_date: Optional[date] = None
    source: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = None


class ConditionResponse(BaseModel):
    """Medical condition record representation."""

    id: UUID = Field(..., description="Condition UUID")
    patient_id: UUID = Field(..., description="UUID of patient")
    condition_name: str = Field(..., description="Condition or diagnosis name")
    name: Optional[str] = Field(default=None, description="Display alias for condition_name")
    condition_code: Optional[str] = Field(default=None, description="ICD-10/SNOMED diagnostic code")
    icd_code: Optional[str] = Field(default=None, description="Display alias for condition_code")
    condition_status: str = Field(..., description="Condition status")
    status: Optional[str] = Field(default=None, description="Display alias for condition_status")
    severity: Optional[str] = Field(default=None, description="Severity")
    onset_date: Optional[date] = Field(default=None, description="Onset date")
    resolved_date: Optional[date] = Field(default=None, description="Resolution date")
    source: Optional[str] = Field(default=None, description="Diagnostic source")
    notes: Optional[str] = Field(default=None, description="Clinical notes")
    created_at: datetime = Field(..., description="Record creation timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Record last update timestamp")

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def populate_aliases(self):
        if not self.name:
            self.name = self.condition_name
        if not self.icd_code:
            self.icd_code = self.condition_code
        if not self.status:
            self.status = self.condition_status
        return self


# -----------------------------------------------------------------------------
# 3. Allergies
# -----------------------------------------------------------------------------
class AllergyCreate(BaseModel):
    """Schema for recording an allergic hypersensitivity."""

    patient_id: Optional[UUID] = Field(default=None, description="UUID of patient")
    allergen: str = Field(..., max_length=255, description="Name of causative agent or substance")
    allergy_type: Optional[str] = Field(default=None, max_length=50, description="Classification")
    severity: Optional[str] = Field(default=None, max_length=50, description="Severity grade")
    reaction: Optional[str] = Field(default=None, description="Clinical manifestation")
    status: str = Field(default="active", description="Status")
    source: Optional[str] = Field(default=None, max_length=100, description="Documentation source")
    notes: Optional[str] = Field(default=None, description="Clinical allergy notes")


class AllergyUpdate(BaseModel):
    """Schema for updating documented allergy details."""

    allergen: Optional[str] = Field(default=None, max_length=255)
    allergy_type: Optional[str] = Field(default=None, max_length=50)
    severity: Optional[str] = Field(default=None, max_length=50)
    reaction: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = None


class AllergyResponse(BaseModel):
    """Patient allergy and adverse reaction representation."""

    id: UUID = Field(..., description="Allergy UUID")
    patient_id: UUID = Field(..., description="UUID of patient")
    allergen: str = Field(..., description="Allergen name")
    allergy_type: Optional[str] = Field(default=None, description="Allergy category")
    severity: Optional[str] = Field(default=None, description="Severity grade")
    reaction: Optional[str] = Field(default=None, description="Manifested reaction")
    status: str = Field(..., description="Allergy status")
    source: Optional[str] = Field(default=None, description="Information source")
    notes: Optional[str] = Field(default=None, description="Notes")
    created_at: datetime = Field(..., description="Record creation timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Record last update timestamp")

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# 4. Medications
# -----------------------------------------------------------------------------
class MedicationCreate(BaseModel):
    """Schema for recording a medication on the patient's active or past list."""

    patient_id: Optional[UUID] = Field(default=None, description="UUID of patient")
    medication_name: Optional[str] = Field(default=None, max_length=255, description="Drug name")
    name: Optional[str] = Field(default=None, max_length=255, description="Alias for medication_name")
    medication_code: Optional[str] = Field(default=None, max_length=50, description="RxNorm or NDC drug code")
    dosage: Optional[str] = Field(default=None, max_length=100, description="Dose amount")
    frequency: Optional[str] = Field(default=None, max_length=100, description="Dosing interval")
    route: Optional[str] = Field(default=None, max_length=50, description="Administration route")
    start_date: Optional[date] = Field(default=None, description="Therapy commencement date")
    end_date: Optional[date] = Field(default=None, description="Therapy completion date")
    status: str = Field(default="active", description="Status: 'active', 'stopped', 'completed'")
    source: Optional[str] = Field(default=None, max_length=100, description="Prescription source")
    notes: Optional[str] = Field(default=None, description="Instructions or indications")

    @model_validator(mode="after")
    def populate_medication_fields(self):
        if not self.medication_name:
            self.medication_name = self.name or "Medication"
        return self


class MedicationUpdate(BaseModel):
    """Schema for updating an existing medication record."""

    medication_name: Optional[str] = Field(default=None, max_length=255)
    name: Optional[str] = Field(default=None, max_length=255)
    medication_code: Optional[str] = Field(default=None, max_length=50)
    dosage: Optional[str] = Field(default=None, max_length=100)
    frequency: Optional[str] = Field(default=None, max_length=100)
    route: Optional[str] = Field(default=None, max_length=50)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    source: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = None


class MedicationResponse(BaseModel):
    """Medication profile record representation."""

    id: UUID = Field(..., description="Medication UUID")
    patient_id: UUID = Field(..., description="UUID of patient")
    medication_name: str = Field(..., description="Medication name")
    name: Optional[str] = Field(default=None, description="Display alias for medication_name")
    medication_code: Optional[str] = Field(default=None, description="RxNorm / NDC identifier")
    dosage: Optional[str] = Field(default=None, description="Dosage")
    frequency: Optional[str] = Field(default=None, description="Frequency")
    route: Optional[str] = Field(default=None, description="Route of administration")
    start_date: Optional[date] = Field(default=None, description="Start date")
    end_date: Optional[date] = Field(default=None, description="End date")
    status: str = Field(..., description="Medication status")
    source: Optional[str] = Field(default=None, description="Source of record")
    notes: Optional[str] = Field(default=None, description="Medication notes")
    created_at: datetime = Field(..., description="Record creation timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Record last update timestamp")

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def populate_aliases(self):
        if not self.name:
            self.name = self.medication_name
        return self


# -----------------------------------------------------------------------------
# 5. Medication Orders
# -----------------------------------------------------------------------------
class MedicationOrderCreate(BaseModel):
    patient_id: Optional[UUID] = Field(default=None)
    doctor_id: Optional[UUID] = Field(default=None)
    encounter_id: Optional[UUID] = Field(default=None)
    medication_name: str = Field(..., max_length=255)
    dosage: Optional[str] = Field(default=None, max_length=100)
    frequency: Optional[str] = Field(default=None, max_length=100)
    route: Optional[str] = Field(default=None, max_length=50)
    duration: Optional[str] = Field(default=None, max_length=50)
    instructions: Optional[str] = Field(default=None)
    order_status: str = Field(default="draft")


class MedicationOrderUpdate(BaseModel):
    medication_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None
    order_status: Optional[str] = None


class MedicationOrderResponse(BaseModel):
    id: UUID
    patient_id: UUID
    encounter_id: Optional[UUID] = None
    doctor_id: Optional[UUID] = None
    medication_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None
    order_status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# 6. Lab Results
# -----------------------------------------------------------------------------
class LabResultCreate(BaseModel):
    """Schema for recording discrete laboratory test assays."""

    patient_id: Optional[UUID] = Field(default=None, description="UUID of patient")
    encounter_id: Optional[UUID] = Field(default=None, description="Associated encounter UUID")
    test_name: str = Field(..., max_length=255, description="Laboratory test name")
    test_code: Optional[str] = Field(default=None, max_length=50, description="LOINC code")
    value: str = Field(..., max_length=100, description="Observed result value")
    unit: Optional[str] = Field(default=None, max_length=50, description="Measurement units")
    reference_range: Optional[str] = Field(default=None, max_length=100, description="Normal reference interval")
    abnormal_flag: Optional[str] = Field(default=None, max_length=20, description="HIGH, LOW, NORMAL")
    is_abnormal: Optional[bool] = Field(default=False, description="Abnormal boolean flag")
    lab_name: Optional[str] = Field(default=None, max_length=100, description="Testing lab")
    collected_at: Optional[datetime] = Field(default=None, description="Collection timestamp")
    result_date: Optional[date] = Field(default_factory=date.today, description="Date analyzed")
    source_file_id: Optional[UUID] = Field(default=None)
    notes: Optional[str] = Field(default=None)

    @model_validator(mode="after")
    def normalize_flags(self):
        if self.is_abnormal and not self.abnormal_flag:
            self.abnormal_flag = "ABNORMAL"
        elif self.abnormal_flag and self.abnormal_flag.upper() in ("HIGH", "LOW", "CRITICAL", "ABNORMAL"):
            self.is_abnormal = True
        return self


class LabResultUpdate(BaseModel):
    test_name: Optional[str] = None
    test_code: Optional[str] = None
    value: Optional[str] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    abnormal_flag: Optional[str] = None
    is_abnormal: Optional[bool] = None
    result_date: Optional[date] = None
    notes: Optional[str] = None


class LabResultResponse(BaseModel):
    id: UUID
    patient_id: UUID
    encounter_id: Optional[UUID] = None
    test_name: str
    test_code: Optional[str] = None
    value: str
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    abnormal_flag: Optional[str] = None
    is_abnormal: bool = Field(default=False)
    collected_at: Optional[datetime] = None
    result_date: Optional[date] = None
    lab_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def populate_abnormal_flag(self):
        if self.abnormal_flag and self.abnormal_flag.upper() in ("HIGH", "LOW", "CRITICAL", "ABNORMAL"):
            self.is_abnormal = True
        if not self.collected_at and self.created_at:
            self.collected_at = self.created_at
        return self


# -----------------------------------------------------------------------------
# 7. Clinical Notes
# -----------------------------------------------------------------------------
class ClinicalNoteCreate(BaseModel):
    """Schema for authoring physician clinical notes and radiology narratives."""

    patient_id: Optional[UUID] = Field(default=None, description="UUID of patient")
    encounter_id: Optional[UUID] = Field(default=None, description="Associated encounter UUID")
    doctor_id: Optional[UUID] = Field(default=None, description="Authoring physician UUID")
    note_type: str = Field(default="progress", max_length=50, description="Note type")
    content: str = Field(..., description="Narrative content of the note")
    structured_content: Optional[Dict[str, Any]] = Field(default_factory=dict)
    source: Optional[str] = Field(default=None, max_length=100)
    status: str = Field(default="final")
    is_ai_generated: Optional[bool] = Field(default=False)


class ClinicalNoteUpdate(BaseModel):
    note_type: Optional[str] = None
    content: Optional[str] = None
    structured_content: Optional[Dict[str, Any]] = None
    status: Optional[str] = None


class ClinicalNoteResponse(BaseModel):
    id: UUID
    patient_id: UUID
    encounter_id: Optional[UUID] = None
    doctor_id: Optional[UUID] = None
    note_type: str
    content: str
    structured_content: Dict[str, Any] = Field(default_factory=dict)
    source: Optional[str] = None
    status: str = Field(default="final")
    is_ai_generated: bool = Field(default=False)
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# 8. Clinical Findings
# -----------------------------------------------------------------------------
class ClinicalFindingCreate(BaseModel):
    workflow_id: UUID
    agent_run_id: UUID
    finding_type: str = "radiology"
    category: str = "general"
    title: str
    description: str
    severity: Optional[str] = None
    confidence: Optional[float] = None
    evidence: Optional[List[str]] = Field(default_factory=list)
    recommendations: Optional[List[str]] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ClinicalFindingResponse(BaseModel):
    id: UUID
    workflow_id: UUID
    agent_run_id: UUID
    finding_type: str
    category: str
    title: str
    description: str
    severity: Optional[str] = None
    confidence: Optional[float] = None
    evidence: Optional[List[str]] = Field(default_factory=list)
    recommendations: Optional[List[str]] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    is_reviewed: bool = False
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
