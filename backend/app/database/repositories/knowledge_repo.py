from uuid import UUID
from typing import Optional, List
from sqlalchemy import select, text, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models.knowledge import KnowledgeSource, KnowledgeDocument, KnowledgeChunk, KnowledgeIngestionJob


class KnowledgeRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_source(self, **kwargs) -> KnowledgeSource:
        src = KnowledgeSource(**kwargs)
        self.session.add(src)
        await self.session.flush()
        await self.session.refresh(src)
        return src

    async def list_sources(self) -> List[KnowledgeSource]:
        result = await self.session.execute(select(KnowledgeSource).order_by(KnowledgeSource.created_at.desc()))
        return list(result.scalars().all())

    async def create_document(self, **kwargs) -> KnowledgeDocument:
        doc = KnowledgeDocument(**kwargs)
        self.session.add(doc)
        await self.session.flush()
        await self.session.refresh(doc)
        return doc

    async def list_documents(self, category: Optional[str] = None, status: Optional[str] = None) -> List[KnowledgeDocument]:
        query = select(KnowledgeDocument)
        if category:
            query = query.where(KnowledgeDocument.category == category)
        if status:
            query = query.where(KnowledgeDocument.ingestion_status == status)
        result = await self.session.execute(query.order_by(KnowledgeDocument.created_at.desc()))
        return list(result.scalars().all())

    async def update_document(self, doc_id: UUID, **kwargs):
        result = await self.session.execute(select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id))
        doc = result.scalar_one_or_none()
        if doc:
            for k, v in kwargs.items():
                if v is not None:
                    setattr(doc, k, v)
            await self.session.flush()
        return doc

    async def delete_document(self, doc_id: UUID) -> bool:
        result = await self.session.execute(select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id))
        doc = result.scalar_one_or_none()
        if doc:
            await self.session.delete(doc)
            await self.session.flush()
            return True
        return False

    async def create_chunks_batch(self, chunks_data: list):
        for c in chunks_data:
            self.session.add(KnowledgeChunk(**c))
        await self.session.flush()

    async def search_by_vector(self, embedding: list, top_k: int = 5, category: Optional[str] = None, specialty: Optional[str] = None, agent_tags: Optional[list] = None):
        filters = []
        if category:
            filters.append("category = :category")
        if specialty:
            filters.append(":specialty = ANY(specialty_tags)")
        if agent_tags:
            filters.append("agent_tags && :agent_tags")
        where_clause = " AND ".join(filters) if filters else "TRUE"
        sql = text(f"""
            SELECT id, chunk_text, title, category, source_url, page_number, section_reference,
                   1 - (embedding <=> :embedding::vector) as relevance_score
            FROM knowledge_chunks
            WHERE embedding IS NOT NULL AND {where_clause}
            ORDER BY embedding <=> :embedding::vector
            LIMIT :top_k
        """)
        params = {"embedding": str(embedding), "top_k": top_k}
        if category: params["category"] = category
        if specialty: params["specialty"] = specialty
        if agent_tags: params["agent_tags"] = agent_tags
        result = await self.session.execute(sql, params)
        return [dict(row._mapping) for row in result.fetchall()]

    async def search_by_text(self, query: str, top_k: int = 5, category: Optional[str] = None):
        q = select(KnowledgeChunk).where(KnowledgeChunk.chunk_text.ilike(f"%{query}%"))
        if category:
            q = q.where(KnowledgeChunk.category == category)
        result = await self.session.execute(q.limit(top_k))
        return list(result.scalars().all())

    async def create_ingestion_job(self, **kwargs) -> KnowledgeIngestionJob:
        job = KnowledgeIngestionJob(**kwargs)
        self.session.add(job)
        await self.session.flush()
        await self.session.refresh(job)
        return job
