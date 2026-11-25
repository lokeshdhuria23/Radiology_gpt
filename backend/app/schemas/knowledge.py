from datetime import date, datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


# -----------------------------------------------------------------------------
# 1. Knowledge Sources
# -----------------------------------------------------------------------------
class KnowledgeSourceCreate(BaseModel):
    """Schema for registering a new knowledge base source repository."""

    name: str = Field(..., max_length=255, description="Knowledge source authority (e.g. ACR, Fleischner Society)")
    source_type: str = Field(..., max_length=50, description="Source classification (e.g. Clinical Guidelines, Consensus, Journal)")
    source_url: Optional[str] = Field(default=None, description="Canonical web URL or portal")
    description: Optional[str] = Field(default=None, description="Source coverage description")
    license_info: Optional[str] = Field(default=None, description="Usage license terms")


class KnowledgeSourceResponse(BaseModel):
    """Knowledge source authority representation."""

    id: UUID = Field(..., description="Knowledge source UUID")
    name: str = Field(..., description="Authority name")
    source_type: str = Field(..., description="Source classification")
    source_url: Optional[str] = Field(default=None, description="Canonical URL")
    description: Optional[str] = Field(default=None, description="Description")
    license_info: Optional[str] = Field(default=None, description="License terms")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# 2. Knowledge Documents
# -----------------------------------------------------------------------------
class KnowledgeDocumentCreate(BaseModel):
    """Schema for adding a guideline document or reference manual."""

    title: str = Field(..., max_length=255, description="Document title")
    category: str = Field(..., max_length=100, description="Primary clinical category (e.g. Radiology Guidelines)")
    source_id: Optional[UUID] = Field(default=None, description="Originating knowledge source UUID")
    subcategory: Optional[str] = Field(default=None, max_length=100, description="Sub-specialty domain (e.g. Neuroradiology)")
    specialty_tags: Optional[List[str]] = Field(default_factory=list, description="Relevant clinical specialties")
    agent_tags: Optional[List[str]] = Field(default_factory=list, description="Clinical agents that leverage this document")
    file_path: Optional[str] = Field(default=None, description="Storage location of the guideline PDF/file")
    file_type: Optional[str] = Field(default="PDF", max_length=50, description="File type")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Document publication year, version, DOI")


class KnowledgeDocumentResponse(BaseModel):
    """Clinical guideline or reference document representation."""

    id: UUID = Field(..., description="Knowledge document UUID")
    source_id: UUID = Field(..., description="Source authority UUID")
    title: str = Field(..., description="Document title")
    file_path: Optional[str] = Field(default=None, description="Storage path")
    file_type: Optional[str] = Field(default=None, description="File type")
    category: Optional[str] = Field(default=None, description="Document category")
    subcategory: Optional[str] = Field(default=None, description="Subcategory")
    specialty_tags: List[str] = Field(default_factory=list, description="Target specialties")
    agent_tags: List[str] = Field(default_factory=list, description="Target agents")
    ingestion_status: str = Field(default="pending", description="Ingestion state: 'pending', 'ingesting', 'completed', 'failed'")
    error_message: Optional[str] = Field(default=None, description="Ingestion error diagnostics")
    chunk_count: int = Field(default=0, description="Total semantic chunks generated")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadata dictionary")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# 3. Knowledge Chunks & RAG Search
# -----------------------------------------------------------------------------
class KnowledgeChunkResponse(BaseModel):
    """Vectorized semantic knowledge chunk representation for RAG grounding."""

    id: UUID = Field(..., description="Knowledge chunk UUID")
    chunk_text: str = Field(..., description="Excerpted guideline or literature text")
    source_title: Optional[str] = Field(default=None, description="Title of parent knowledge source or document")
    category: Optional[str] = Field(default=None, description="Knowledge category")
    relevance_score: Optional[float] = Field(default=None, description="Cosine similarity or vector search score")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Chunk level metadata")
    document_id: Optional[UUID] = Field(default=None, description="Parent document UUID")
    source_id: Optional[UUID] = Field(default=None, description="Parent source authority UUID")
    subcategory: Optional[str] = Field(default=None, description="Subcategory")
    title: Optional[str] = Field(default=None, description="Section heading or title")
    chunk_index: Optional[int] = Field(default=None, description="Position index within document")
    source_url: Optional[str] = Field(default=None, description="Reference URL")
    publication_date: Optional[date] = Field(default=None, description="Publication date")
    version: Optional[str] = Field(default=None, description="Guideline edition or version")
    page_number: Optional[int] = Field(default=None, description="Page number reference")
    section_reference: Optional[str] = Field(default=None, description="Section code or title")
    license_info: Optional[str] = Field(default=None, description="License information")
    specialty_tags: List[str] = Field(default_factory=list, description="Relevant specialties")
    agent_tags: List[str] = Field(default_factory=list, description="Relevant agent tags")
    created_at: Optional[datetime] = Field(default=None, description="Chunk creation timestamp")

    model_config = ConfigDict(from_attributes=True)


class KnowledgeSearchRequest(BaseModel):
    """Semantic vector search query for clinical guidelines and literature."""

    query: str = Field(..., description="Natural language search prompt or clinical question")
    category: Optional[str] = Field(default=None, description="Filter by category (e.g. 'Radiology Guidelines')")
    specialty: Optional[str] = Field(default=None, description="Filter by specialty tag")
    agent_tags: Optional[List[str]] = Field(default=None, description="Filter chunks matching agent tags")
    top_k: int = Field(default=5, ge=1, le=50, description="Maximum number of relevant chunks to retrieve")


# -----------------------------------------------------------------------------
# 4. Ingestion Jobs
# -----------------------------------------------------------------------------
class IngestionJobResponse(BaseModel):
    """Background ingestion tracking job."""

    id: UUID = Field(..., description="Ingestion job UUID")
    document_id: UUID = Field(..., description="Ingested document UUID")
    status: str = Field(default="pending", description="Job status: 'pending', 'running', 'completed', 'failed'")
    started_at: Optional[datetime] = Field(default=None, description="Job commencement timestamp")
    completed_at: Optional[datetime] = Field(default=None, description="Job completion timestamp")
    error_message: Optional[str] = Field(default=None, description="Failure error details")
    chunks_created: int = Field(default=0, description="Total chunks ingested and embedded")
    created_at: datetime = Field(..., description="Job record creation timestamp")

    model_config = ConfigDict(from_attributes=True)
