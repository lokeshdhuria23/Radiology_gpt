from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class DashboardStats(BaseModel):
    """Aggregate high-level metrics for clinical dashboard."""

    total_patients: int = Field(default=0, ge=0, description="Total registered patients")
    active_encounters: int = Field(default=0, ge=0, description="Currently active clinical encounters")
    pending_reports: int = Field(default=0, ge=0, description="AI reports currently in draft or generation")
    pending_reviews: int = Field(default=0, ge=0, description="Reports awaiting physician attestation")
    recent_uploads: int = Field(default=0, ge=0, description="Medical scans/documents uploaded recently")

    model_config = ConfigDict(from_attributes=True)


class RecentActivityItem(BaseModel):
    """Audit and clinical timeline event item for dashboard feed."""

    action: str = Field(..., description="Action performed (e.g. VIEW_PATIENT_RECORD, TRIGGER_AI_WORKFLOW)")
    entity_type: str = Field(..., description="Affected entity table (e.g. patients, clinical_reports)")
    entity_id: Optional[UUID] = Field(default=None, description="Target entity UUID")
    description: str = Field(..., description="Human-readable event summary")
    timestamp: datetime = Field(..., description="Event timestamp")
    user_name: Optional[str] = Field(default=None, description="Actor display name if available")

    model_config = ConfigDict(from_attributes=True)


class PendingReviewItem(BaseModel):
    """Report pending physician sign-off displayed on physician workbench."""

    report_id: UUID = Field(..., description="UUID of clinical report")
    patient_name: str = Field(..., description="Patient name")
    encounter_date: datetime = Field(..., description="Encounter occurrence timestamp")
    status: str = Field(..., description="Report status ('draft', 'in_review')")
    generated_at: datetime = Field(..., description="Report generation timestamp")

    model_config = ConfigDict(from_attributes=True)
