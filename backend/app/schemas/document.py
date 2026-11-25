from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class FileUploadResponse(BaseModel):
    """Response returned immediately after file upload to object storage."""

    id: UUID = Field(..., description="Medical file UUID generated for the upload")
    filename: str = Field(..., description="Original filename uploaded by user")
    storage_path: str = Field(..., description="Bucket relative storage path")
    processing_status: str = Field(default="pending", description="Initial processing status ('pending', 'processing', 'completed', 'failed')")

    model_config = ConfigDict(from_attributes=True)


class DocumentResponse(BaseModel):
    """Complete medical file record with metadata and extraction summary."""

    id: UUID = Field(..., description="Medical file primary UUID")
    patient_id: UUID = Field(..., description="Associated patient UUID")
    encounter_id: Optional[UUID] = Field(default=None, description="Linked encounter UUID")
    uploaded_by: Optional[UUID] = Field(default=None, description="User UUID who initiated upload")
    original_filename: str = Field(..., description="Uploaded filename")
    storage_path: str = Field(..., description="Path within storage bucket")
    file_type: Optional[str] = Field(default=None, description="File type extension (e.g. DICOM, PDF, PNG)")
    mime_type: Optional[str] = Field(default=None, description="MIME content type")
    file_size: Optional[int] = Field(default=None, description="File size in bytes")
    document_category: Optional[str] = Field(default=None, description="Category (e.g. Radiology Scan, Lab Sheet, Ultrasound Report)")
    processing_status: str = Field(default="pending", description="Processing lifecycle status ('pending', 'processing', 'completed', 'failed')")
    upload_timestamp: datetime = Field(..., description="Timestamp of upload")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="DICOM tags, scanner metadata, or document attributes")
    created_at: datetime = Field(..., description="Record creation timestamp")
    extraction_summary: Optional[Dict[str, Any]] = Field(default=None, description="Summary of parsed OCR or structured findings")

    model_config = ConfigDict(from_attributes=True)


class DocumentListResponse(BaseModel):
    """Collection wrapper for medical file documents."""

    items: List[DocumentResponse] = Field(default_factory=list, description="List of medical files")
    total: Optional[int] = Field(default=None, description="Total count of documents matching query")

    model_config = ConfigDict(from_attributes=True)


class ExtractionResponse(BaseModel):
    """Extracted text, structured data, and OCR features from a medical document."""

    id: UUID = Field(..., description="Document extraction UUID")
    medical_file_id: UUID = Field(..., description="Source medical file UUID")
    extraction_type: Optional[str] = Field(default=None, description="Extraction pipeline type (e.g. DICOM Header, PDF OCR, Vision)")
    extracted_text: Optional[str] = Field(default=None, description="Raw OCR or text extraction")
    structured_data: Dict[str, Any] = Field(default_factory=dict, description="Parsed entities, measurements, and key-value pairs")
    confidence: Optional[float] = Field(default=None, description="Extraction confidence score (0.0 to 1.0)")
    extraction_status: str = Field(default="pending", description="Status: 'pending', 'processing', 'completed', 'failed'")
    error_message: Optional[str] = Field(default=None, description="Error diagnostics if extraction failed")
    agent_run_id: Optional[UUID] = Field(default=None, description="Associated agent run UUID if extraction executed by an agent")
    created_at: datetime = Field(..., description="Extraction timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Extraction record update timestamp")

    model_config = ConfigDict(from_attributes=True)


class DocumentProcessRequest(BaseModel):
    """Request to trigger OCR, entity extraction, or reprocessing on a document."""

    force_reprocess: bool = Field(default=False, description="Whether to bypass cache and force pipeline re-execution")
