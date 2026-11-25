from uuid import UUID
from typing import Optional, List, Dict
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models.document import DocumentChunk
from app.database.models.knowledge import KnowledgeChunk
from app.rag.embedding_service import EmbeddingService
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class RetrievalService:
    def __init__(self):
        self.embedding_service = EmbeddingService()

    async def search_patient_documents(self, query: str, patient_id: UUID, top_k: int = 5, session: AsyncSession = None) -> List[Dict]:
        """Search patient-specific documents. NEVER crosses patient boundaries."""
        embedding = self.embedding_service.embed_text(query)

        if embedding and settings.VECTOR_SEARCH_ENABLED:
            try:
                vec_str = "[" + ",".join(str(round(v, 6)) for v in embedding) + "]"
                sql = text("""
                    SELECT id, chunk_text, chunk_index, metadata,
                           1 - (embedding <=> CAST(:embedding AS vector)) as relevance_score
                    FROM document_chunks
                    WHERE patient_id = :patient_id AND embedding IS NOT NULL
                    ORDER BY embedding <=> CAST(:embedding AS vector)
                    LIMIT :top_k
                """)
                result = await session.execute(sql, {"embedding": vec_str, "patient_id": str(patient_id), "top_k": top_k})
                rows = result.fetchall()
                return [{"chunk_text": r.chunk_text, "chunk_index": r.chunk_index, "metadata": r.metadata, "relevance_score": float(r.relevance_score), "source": "vector"} for r in rows]
            except Exception as e:
                logger.warning(f"Vector search failed, falling back to keyword: {e}")
                await session.rollback()

        # Keyword fallback
        q = select(DocumentChunk).where(
            DocumentChunk.patient_id == patient_id,
            DocumentChunk.chunk_text.ilike(f"%{query}%"),
        ).limit(top_k)
        result = await session.execute(q)
        chunks = result.scalars().all()
        return [{"chunk_text": c.chunk_text, "chunk_index": c.chunk_index, "metadata": c.metadata or {}, "relevance_score": None, "source": "keyword"} for c in chunks]

    async def search_knowledge_base(self, query: str, top_k: int = 5, category: Optional[str] = None, specialty: Optional[str] = None, agent_tags: Optional[List[str]] = None, session: AsyncSession = None) -> List[Dict]:
        embedding = self.embedding_service.embed_text(query)

        if embedding and settings.VECTOR_SEARCH_ENABLED:
            try:
                vec_str = "[" + ",".join(str(round(v, 6)) for v in embedding) + "]"
                filters = ["embedding IS NOT NULL"]
                params = {"embedding": vec_str, "top_k": top_k}
                if category:
                    filters.append("category = :category")
                    params["category"] = category
                if specialty:
                    filters.append(":specialty = ANY(specialty_tags)")
                    params["specialty"] = specialty
                where = " AND ".join(filters)
                sql = text(f"""
                    SELECT id, chunk_text, title, category, source_url, page_number, section_reference,
                           1 - (embedding <=> CAST(:embedding AS vector)) as relevance_score
                    FROM knowledge_chunks WHERE {where}
                    ORDER BY embedding <=> CAST(:embedding AS vector) LIMIT :top_k
                """)
                result = await session.execute(sql, params)
                rows = result.fetchall()
                return [{"chunk_text": r.chunk_text, "title": r.title, "category": r.category, "source_url": r.source_url, "page_number": r.page_number, "section_reference": r.section_reference, "relevance_score": float(r.relevance_score), "source": "vector"} for r in rows]
            except Exception as e:
                logger.warning(f"Knowledge vector search failed: {e}")
                await session.rollback()

        # Keyword fallback
        q = select(KnowledgeChunk).where(KnowledgeChunk.chunk_text.ilike(f"%{query}%"))
        if category:
            q = q.where(KnowledgeChunk.category == category)
        result = await session.execute(q.limit(top_k))
        chunks = result.scalars().all()
        return [{"chunk_text": c.chunk_text, "title": c.title, "category": c.category, "source_url": c.source_url, "relevance_score": None, "source": "keyword"} for c in chunks]
