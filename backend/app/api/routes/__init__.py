from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.patients import router as patients_router
from app.api.routes.encounters import router as encounters_router
from app.api.routes.clinical import router as clinical_router
from app.api.routes.documents import router as documents_router
from app.api.routes.workflows import router as workflows_router
from app.api.routes.reports import router as reports_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.knowledge import router as knowledge_router
from app.api.routes.rag import router as rag_router
from app.api.routes.settings import router as settings_router
from app.api.routes.patient_assistant import router as patient_assistant_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(patients_router, prefix="/patients", tags=["Patients"])
api_router.include_router(encounters_router, prefix="/encounters", tags=["Encounters"])
api_router.include_router(clinical_router, tags=["Clinical Data"])
api_router.include_router(documents_router, prefix="/documents", tags=["Documents"])
api_router.include_router(workflows_router, prefix="/workflows", tags=["AI Workflows"])
api_router.include_router(reports_router, prefix="/reports", tags=["Reports"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(knowledge_router, prefix="/knowledge", tags=["Knowledge Base"])
api_router.include_router(rag_router, prefix="/rag", tags=["RAG Search"])
api_router.include_router(settings_router, prefix="/settings", tags=["Settings"])
api_router.include_router(patient_assistant_router, prefix="/patient-assistant", tags=["Patient AI Assistant"])
