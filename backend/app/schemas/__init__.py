"""
CDSS Pydantic Schemas Package.
Imports and exports all API request and response data models.
"""

from app.schemas.common import (
    ErrorResponse,
    PaginatedResponse,
    PaginationParams,
    SuccessResponse,
)
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.patient import (
    PatientCreate,
    PatientDetailResponse,
    PatientResponse,
    PatientSearchParams,
    PatientUpdate,
)
from app.schemas.encounter import (
    EncounterCreate,
    EncounterResponse,
    EncounterUpdate,
)
from app.schemas.clinical import (
    AllergyCreate,
    AllergyResponse,
    AllergyUpdate,
    ClinicalFindingCreate,
    ClinicalFindingResponse,
    ClinicalNoteCreate,
    ClinicalNoteResponse,
    ClinicalNoteUpdate,
    ConditionCreate,
    ConditionResponse,
    ConditionUpdate,
    LabResultCreate,
    LabResultResponse,
    LabResultUpdate,
    MedicationCreate,
    MedicationOrderCreate,
    MedicationOrderResponse,
    MedicationOrderUpdate,
    MedicationResponse,
    MedicationUpdate,
    VitalCreate,
    VitalResponse,
)
from app.schemas.document import (
    DocumentListResponse,
    DocumentProcessRequest,
    DocumentResponse,
    ExtractionResponse,
    FileUploadResponse,
)
from app.schemas.workflow import (
    AgentRunRequest,
    AgentRunResponse,
    WorkflowCreate,
    WorkflowResponse,
    WorkflowStatusResponse,
)
from app.schemas.report import (
    ReportResponse,
    ReportUpdateRequest,
    ReviewCreate,
    ReviewResponse,
    StructuredReportSection,
)
from app.schemas.dashboard import (
    DashboardStats,
    PendingReviewItem,
    RecentActivityItem,
)
from app.schemas.knowledge import (
    IngestionJobResponse,
    KnowledgeChunkResponse,
    KnowledgeDocumentCreate,
    KnowledgeDocumentResponse,
    KnowledgeSearchRequest,
    KnowledgeSourceCreate,
    KnowledgeSourceResponse,
)

__all__ = [
    # Common
    "PaginationParams",
    "PaginatedResponse",
    "ErrorResponse",
    "SuccessResponse",
    # Auth
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "UserResponse",
    # Patient
    "PatientCreate",
    "PatientUpdate",
    "PatientResponse",
    "PatientDetailResponse",
    "PatientSearchParams",
    # Encounter
    "EncounterCreate",
    "EncounterUpdate",
    "EncounterResponse",
    # Clinical
    "VitalCreate",
    "VitalResponse",
    "ConditionCreate",
    "ConditionUpdate",
    "ConditionResponse",
    "AllergyCreate",
    "AllergyUpdate",
    "AllergyResponse",
    "MedicationCreate",
    "MedicationUpdate",
    "MedicationResponse",
    "MedicationOrderCreate",
    "MedicationOrderUpdate",
    "MedicationOrderResponse",
    "LabResultCreate",
    "LabResultUpdate",
    "LabResultResponse",
    "ClinicalNoteCreate",
    "ClinicalNoteUpdate",
    "ClinicalNoteResponse",
    "ClinicalFindingCreate",
    "ClinicalFindingResponse",
    # Document
    "FileUploadResponse",
    "DocumentResponse",
    "DocumentListResponse",
    "ExtractionResponse",
    "DocumentProcessRequest",
    # Workflow
    "WorkflowCreate",
    "WorkflowResponse",
    "WorkflowStatusResponse",
    "AgentRunResponse",
    "AgentRunRequest",
    # Report
    "ReportResponse",
    "ReportUpdateRequest",
    "ReviewCreate",
    "ReviewResponse",
    "StructuredReportSection",
    # Dashboard
    "DashboardStats",
    "RecentActivityItem",
    "PendingReviewItem",
    # Knowledge
    "KnowledgeSourceCreate",
    "KnowledgeSourceResponse",
    "KnowledgeDocumentCreate",
    "KnowledgeDocumentResponse",
    "KnowledgeChunkResponse",
    "KnowledgeSearchRequest",
    "IngestionJobResponse",
]
