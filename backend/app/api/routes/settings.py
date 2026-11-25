from fastapi import APIRouter, Depends, Body
from typing import Optional, Dict, Any
from pydantic import BaseModel
from app.api.dependencies.auth import get_current_user
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

# In-memory doctor profile store
DOCTOR_PROFILES: Dict[str, Dict[str, Any]] = {
    "doctor@demo.com": {
        "practice_country": "India (detected)",
        "first_name": "Ashish",
        "last_name": "",
        "degree_type": "MD",
        "institution": "Metropolitan Hospital",
        "practice_type": "Academic Medical Center",
        "specialty": "General",
        "email": "doctor@demo.com",
    }
}


class ProfileUpdateRequest(BaseModel):
    practice_country: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    degree_type: Optional[str] = None
    institution: Optional[str] = None
    practice_type: Optional[str] = None
    specialty: Optional[str] = None


@router.get("/profile")
async def get_doctor_profile(user: dict = Depends(get_current_user)):
    email = user.get("email", "doctor@demo.com")
    name = user.get("full_name") or user.get("doctor_name") or user.get("username") or "Doctor"
    parts = name.strip().split(" ")
    first = parts[0]
    last = " ".join(parts[1:]) if len(parts) > 1 else ""

    if email in DOCTOR_PROFILES:
        profile = DOCTOR_PROFILES[email]
    else:
        profile = {
            "practice_country": "India (detected)",
            "first_name": first,
            "last_name": last,
            "degree_type": "MD",
            "institution": "Metropolitan Hospital",
            "practice_type": "Academic Medical Center",
            "specialty": user.get("specialty", "General"),
            "email": email,
        }
    return profile


@router.put("/profile")
async def update_doctor_profile(body: ProfileUpdateRequest, user: dict = Depends(get_current_user)):
    email = user.get("email", "doctor@demo.com")
    existing = DOCTOR_PROFILES.setdefault(email, {
        "practice_country": "India (detected)",
        "first_name": "Ashish",
        "last_name": "",
        "degree_type": "MD",
        "institution": "Metropolitan Hospital",
        "practice_type": "Academic Medical Center",
        "specialty": "General",
        "email": email,
    })
    
    update_data = body.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        if v is not None:
            existing[k] = v
            
    return {"message": "Profile updated successfully", "profile": existing}


@router.put("/specialty")
async def update_doctor_specialty(payload: dict = Body(...), user: dict = Depends(get_current_user)):
    specialty = payload.get("specialty", "General")
    email = user.get("email", "doctor@demo.com")
    profile = DOCTOR_PROFILES.setdefault(email, {
        "practice_country": "India (detected)",
        "first_name": "Ashish",
        "last_name": "",
        "degree_type": "MD",
        "institution": "Metropolitan Hospital",
        "practice_type": "Academic Medical Center",
        "specialty": "General",
        "email": email,
    })
    profile["specialty"] = specialty
    return {"message": f"Clinical specialty set to {specialty}", "specialty": specialty}


@router.get("/status")
async def get_system_status(user: dict = Depends(get_current_user)):
    # Model registry status
    model_info = {}
    try:
        from app.inference.model_registry import ModelRegistry
        registry = ModelRegistry()
        model_info = registry.get_status()
    except Exception:
        model_info = {"models": {}}

    # Database connectivity
    db_status = "disconnected"
    try:
        from app.database.session import AsyncSessionLocal
        from sqlalchemy import text
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
            db_status = "connected"
    except Exception:
        db_status = "disconnected"

    # Storage connectivity
    storage_status = "configured" if settings.SUPABASE_URL else "not_configured"

    return {
        "status": "healthy",
        "version": "1.0.0",
        "demo_mode": settings.DEMO_MODE,
        "database": db_status,
        "storage": storage_status,
        "models": model_info.get("models", {}),
        "device": settings.DEVICE,
        "environment": settings.APP_ENV,
    }
