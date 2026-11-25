from fastapi import APIRouter, Depends
from app.api.dependencies.auth import get_current_user
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    # Try database, fall back to demo data
    try:
        from sqlalchemy import select, func
        from app.database.session import AsyncSessionLocal
        from app.database.models.patient import Patient
        from app.database.models.encounter import Encounter
        from app.database.models.report import ClinicalReport

        async with AsyncSessionLocal() as db:
            patients = (await db.execute(select(func.count(Patient.id)))).scalar() or 0
            encounters = (await db.execute(select(func.count(Encounter.id)))).scalar() or 0
            reports = (await db.execute(select(func.count(ClinicalReport.id)))).scalar() or 0
            pending = (await db.execute(
                select(func.count(ClinicalReport.id)).where(ClinicalReport.status.in_(["draft", "in_review"]))
            )).scalar() or 0
            return {
                "total_patients": patients,
                "total_encounters": encounters,
                "total_workflows": reports,
                "pending_reviews": pending,
                "recent_patients": [],
                "recent_workflows": [],
            }
    except Exception as e:
        logger.warning(f"DB unavailable for dashboard stats: {e}")
        if settings.DEMO_MODE:
            return {
                "total_patients": 3,
                "total_encounters": 7,
                "total_workflows": 2,
                "pending_reviews": 1,
                "recent_patients": [
                    {
                        "id": "00000000-0000-0000-0000-000000000101",
                        "medical_record_number": "MRN-DEMO-001",
                        "first_name": "James",
                        "last_name": "Wilson",
                        "date_of_birth": "1965-03-14",
                        "gender": "male",
                        "blood_type": "A+",
                        "is_active": True,
                        "created_at": "2024-01-15T10:30:00Z",
                        "updated_at": "2024-01-15T10:30:00Z",
                    },
                    {
                        "id": "00000000-0000-0000-0000-000000000102",
                        "medical_record_number": "MRN-DEMO-002",
                        "first_name": "Maria",
                        "last_name": "Garcia",
                        "date_of_birth": "1978-09-22",
                        "gender": "female",
                        "blood_type": "O-",
                        "is_active": True,
                        "created_at": "2024-01-10T08:15:00Z",
                        "updated_at": "2024-01-10T08:15:00Z",
                    },
                ],
                "recent_workflows": [],
            }
        raise
