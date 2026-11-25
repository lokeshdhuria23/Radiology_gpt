from typing import Any, Dict, List, Optional, Union
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client, create_client

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("security")

# Password hashing context using passlib bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer scheme for dependency injection
http_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a plain text password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against the hashed password."""
    return pwd_context.verify(plain_password, hashed_password)


def verify_supabase_token(token: str) -> dict:
    """
    Decode and verify a Supabase JWT token using PyJWT with HS256 algorithm and JWT_SECRET.
    Raises HTTPException 401 on expired or invalid signatures.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # In DEMO_MODE, support a mock/demo token for rapid testing
    if settings.DEMO_MODE and token.startswith("demo-"):
        return {
            "sub": "00000000-0000-0000-0000-000000000001",
            "email": "demo.doctor@cdss.hospital.org",
            "role": "radiologist",
            "app_metadata": {"role": "radiologist", "roles": ["radiologist", "physician"]},
            "user_metadata": {"name": "Dr. Demo Radiologist", "role": "radiologist"},
        }

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except ExpiredSignatureError:
        logger.warning("Token verification failed: signature expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InvalidTokenError as e:
        logger.warning(f"Token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Unexpected error during token verification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user_from_token(token: str) -> dict:
    """
    Extract user info dictionary (AppUser representation) from verified Supabase token.
    """
    payload = verify_supabase_token(token)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing subject ('sub')",
            headers={"WWW-Authenticate": "Bearer"},
        )

    app_metadata = payload.get("app_metadata", {})
    user_metadata = payload.get("user_metadata", {})

    # Determine user role from user_metadata, app_metadata, or payload top-level
    role = (
        user_metadata.get("role")
        or app_metadata.get("role")
        or payload.get("role")
        or "authenticated"
    )

    return {
        "id": user_id,
        "email": payload.get("email"),
        "role": role,
        "aud": payload.get("aud"),
        "app_metadata": app_metadata,
        "user_metadata": user_metadata,
        "payload": payload,
    }


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
) -> dict:
    """FastAPI dependency to retrieve the authenticated user from the Bearer token."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return get_current_user_from_token(credentials.credentials)


def create_supabase_client() -> Client:
    """
    Create an authenticated Supabase client using SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
    Falls back to SUPABASE_ANON_KEY if service role key is not configured.
    """
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    return create_client(settings.SUPABASE_URL, key)


def create_anon_supabase_client() -> Client:
    """
    Create a public/anon Supabase client using SUPABASE_URL and SUPABASE_ANON_KEY.
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


class RoleChecker:
    """
    Role-based authorization checker.
    Can be used directly: checker(user_dict)
    Or as a FastAPI dependency: Depends(RoleChecker(["admin", "radiologist"]))
    Raises HTTP 403 Forbidden if user lacks required role.
    """

    def __init__(self, allowed_roles: Union[List[str], str]):
        if isinstance(allowed_roles, str):
            self.allowed_roles = [allowed_roles]
        else:
            self.allowed_roles = list(allowed_roles)

    def __call__(self, user: dict = Depends(get_current_user)) -> dict:
        user_role = user.get("role")
        app_metadata = user.get("app_metadata", {})
        roles_list = [user_role] if user_role else []

        if isinstance(app_metadata.get("roles"), list):
            roles_list.extend(app_metadata["roles"])

        if not any(r in self.allowed_roles for r in roles_list):
            logger.warning(
                f"Unauthorized access attempt by user {user.get('id')} with role(s) {roles_list}. "
                f"Required roles: {self.allowed_roles}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required roles: {self.allowed_roles}",
            )
        return user
