from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.dependencies.auth import get_current_user, require_role
from app.database.repositories.knowledge_repo import KnowledgeRepository

router = APIRouter()


@router.post("/sources", status_code=201)
async def create_source(name: str = Form(...), source_type: str = Form("manual"), description: str = Form(None), db: AsyncSession = Depends(get_db), user: dict = Depends(require_role("admin"))):
    repo = KnowledgeRepository(db)
    source = await repo.create_source(name=name, source_type=source_type, description=description)
    await db.commit()
    return {"id": str(source.id), "name": source.name}


@router.get("/sources")
async def list_sources(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    repo = KnowledgeRepository(db)
    sources = await repo.list_sources()
    return {"items": [{"id": str(s.id), "name": s.name, "source_type": s.source_type, "description": s.description} for s in sources]}


@router.get("/documents")
async def list_documents(category: str = None, status: str = None, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    repo = KnowledgeRepository(db)
    docs = await repo.list_documents(category, status)
    return {"items": [{
        "id": str(d.id), "title": d.title, "category": d.category,
        "ingestion_status": d.ingestion_status, "chunk_count": d.chunk_count,
        "specialty_tags": d.specialty_tags, "agent_tags": d.agent_tags,
    } for d in docs]}


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: UUID, db: AsyncSession = Depends(get_db), user: dict = Depends(require_role("admin"))):
    repo = KnowledgeRepository(db)
    deleted = await repo.delete_document(doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.commit()
    return {"message": "Document deleted"}
