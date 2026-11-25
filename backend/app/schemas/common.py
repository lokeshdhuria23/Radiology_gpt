from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    """Query parameters for paginated list endpoints."""

    page: int = Field(default=1, ge=1, description="Page number, 1-indexed")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page (max 100)")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic envelope schema for paginated responses."""

    items: List[T] = Field(default_factory=list, description="List of items for the requested page")
    total: int = Field(..., ge=0, description="Total count of items matching filter criteria")
    page: int = Field(..., ge=1, description="Current page number")
    page_size: int = Field(..., ge=1, description="Number of items per page")
    total_pages: int = Field(..., ge=0, description="Total number of available pages")

    model_config = ConfigDict(from_attributes=True)


class ErrorResponse(BaseModel):
    """Standard error response payload."""

    detail: str = Field(..., description="Human-readable description of the error")
    error_code: Optional[str] = Field(default=None, description="Application error code for programmatic handling")


class SuccessResponse(BaseModel):
    """Generic operational success response."""

    message: str = Field(..., description="Operation success message")
    data: Any = Field(default=None, description="Optional payload returned with operation")
