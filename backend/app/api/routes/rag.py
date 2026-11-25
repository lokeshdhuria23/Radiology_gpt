from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.dependencies.auth import get_current_user
from app.rag.retrieval import RetrievalService
from uuid import UUID

router = APIRouter()
retrieval = RetrievalService()


class PatientSearchRequest(BaseModel):
    patient_id: UUID
    query: str
    top_k: int = 5


class KnowledgeSearchRequest(BaseModel):
    query: str
    category: Optional[str] = None
    specialty: Optional[str] = None
    agent_tags: Optional[List[str]] = None
    top_k: int = 5
    limit: Optional[int] = None


@router.post("/search")
@router.post("/patient-search")
async def search_patient_docs(body: PatientSearchRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    k = body.top_k
    results = await retrieval.search_patient_documents(body.query, body.patient_id, k, db)
    return {"results": results, "query": body.query, "patient_id": str(body.patient_id)}


@router.post("/search-knowledge")
@router.post("/knowledge-search")
async def search_knowledge(body: KnowledgeSearchRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    k = body.limit or body.top_k
    results = await retrieval.search_knowledge_base(body.query, k, body.category, body.specialty, body.agent_tags, db)
    return {"results": results, "query": body.query}
