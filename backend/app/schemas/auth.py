from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

try:
    import email_validator  # noqa: F401
    from pydantic import EmailStr
except ImportError:
    EmailStr = str  # type: ignore[assignment, misc]


class LoginRequest(BaseModel):
    """User login request payload."""

    email: EmailStr = Field(..., description="User's registered email address")
    password: str = Field(..., min_length=4, description="User's password")


class RegisterRequest(BaseModel):
    """User registration request payload."""

    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., min_length=4, description="User's password")
    full_name: Optional[str] = Field(default=None, description="User's full name")
    username: Optional[str] = Field(default=None, description="User's display or system username")
    role: str = Field(default="doctor", description="User role ('admin', 'doctor', 'patient', 'staff')")
    specialty: Optional[str] = Field(default=None, description="Doctor specialty")
    license_number: Optional[str] = Field(default=None, description="Doctor medical license or NPI")
    date_of_birth: Optional[str] = Field(default=None, description="Patient date of birth (YYYY-MM-DD)")
    sex: Optional[str] = Field(default=None, description="Patient biological sex")
    phone: Optional[str] = Field(default=None, description="Contact phone")
    consultation_type: Optional[str] = Field(default="Radiology", description="Requested consultation department / reason for visit")


class UserResponse(BaseModel):
    """Application user representation."""

    id: UUID = Field(..., description="Primary UUID identifier for app_user")
    auth_user_id: Optional[UUID] = Field(default=None, description="Linked Supabase Auth user UUID")
    username: Optional[str] = Field(default=None, description="User display name or handle")
    full_name: Optional[str] = Field(default=None, description="User's full name")
    email: str = Field(..., description="User email address")
    role: str = Field(..., description="User system role")
    specialty: Optional[str] = Field(default=None, description="Physician specialty")
    is_active: bool = Field(default=True, description="Account active status")
    created_at: Optional[datetime] = Field(default=None, description="Account creation timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Account last update timestamp")

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """OAuth2 / JWT Bearer token response."""

    access_token: str = Field(..., description="Signed JWT access token")
    token_type: str = Field(default="bearer", description="Token authorization type")
    user: UserResponse = Field(..., description="Authenticated user account details")

    model_config = ConfigDict(from_attributes=True)
