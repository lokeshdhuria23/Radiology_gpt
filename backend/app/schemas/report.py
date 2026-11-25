from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class StructuredReportSection(BaseModel):
    """Individual section within a structured clinical report."""

    title: str = Field(..., description="Section heading (e.g. Clinical History, Findings, Impression)")
    content: str = Field(..., description="Text content for this section")
    source_agent: Optional[str] = Field(default=None, description="Agent responsible for synthesizing this section")
    evidence: Optional[List[Any]] = Field(default_factory=list, description="Supporting citations, slice numbers, or bounding boxes")
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Diagnostic confidence score (0.0 to 1.0)")

    model_config = ConfigDict(from_attributes=True)


class ReviewCreate(BaseModel):
    """Schema for a physician submitting an attestation review for a report."""

    review_status: str = Field(..., description="Review outcome ('pending', 'approved', 'rejected', 'needs_revision')")
    comments: Optional[str] = Field(default=None, description="Physician oversight notes, corrections, or rationale")


class ReviewResponse(BaseModel):
    """Physician attestation and review record."""

    id: UUID = Field(..., description="Review record UUID")
    report_id: UUID = Field(..., description="Reviewed report UUID")
    doctor_id: UUID = Field(..., description="Reviewing physician UUID")
    review_status: str = Field(..., description="Attestation status")
    comments: Optional[str] = Field(default=None, description="Physician comments")
    reviewed_at: Optional[datetime] = Field(default=None, description="Review completion timestamp")
    created_at: datetime = Field(..., description="Record creation timestamp")
    doctor_name: Optional[str] = Field(default=None, description="Reviewing doctor's full name for presentation")

    model_config = ConfigDict(from_attributes=True)


class ReportUpdateRequest(BaseModel):
    """Schema for doctor modifications or amendments to an AI report."""

    report_content: Optional[str] = Field(default=None, description="Amended narrative report content")
    structured_report: Optional[Dict[str, Any]] = Field(default=None, description="Updated structured report sections")
    status: Optional[str] = Field(default=None, description="Updated report lifecycle status ('draft', 'in_review', 'finalized', 'amended')")


class ReportResponse(BaseModel):
    """Synthesized clinical diagnostic report representation."""

    id: UUID = Field(..., description="Clinical report UUID")
    patient_id: UUID = Field(..., description="UUID of the patient")
    encounter_id: Optional[UUID] = Field(default=None, description="Linked encounter UUID")
    workflow_id: Optional[UUID] = Field(default=None, description="Originating AI workflow orchestration UUID")
    report_version: int = Field(default=1, description="Version number of report (increments upon amendment)")
    report_content: Optional[str] = Field(default=None, description="Full narrative report text")
    structured_report: Dict[str, Any] = Field(default_factory=dict, description="Structured report JSON including sections, scores, and recommendations")
    status: str = Field(default="draft", description="Lifecycle status: 'draft', 'in_review', 'finalized', 'amended'")
    generated_at: datetime = Field(..., description="Initial generation timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Last update or amendment timestamp")
    reviews: Optional[List[ReviewResponse]] = Field(default_factory=list, description="Physician reviews and sign-offs")
    patient_name: Optional[str] = Field(default=None, description="Full name of patient for presentation")

    model_config = ConfigDict(from_attributes=True)
