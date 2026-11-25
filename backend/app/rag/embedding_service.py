from uuid import UUID
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.inference.model_registry import ModelRegistry
from app.database.repositories.document_repo import DocumentRepository
from app.core.logging import get_logger

logger = get_logger(__name__)


class EmbeddingService:
    def __init__(self):
        self.registry = ModelRegistry()

    def embed_text(self, text: str) -> Optional[List[float]]:
        model = self.registry.get_embedding_model()
        return model.embed_text(text)

    def embed_batch(self, texts: List[str]) -> Optional[List[List[float]]]:
        model = self.registry.get_embedding_model()
        return model.embed_batch(texts)

    async def embed_and_store_chunks(self, chunks: list, patient_id: UUID, file_id: UUID, session: AsyncSession, encounter_id: Optional[UUID] = None, extraction_id: Optional[UUID] = None):
        doc_repo = DocumentRepository(session)
        texts = [c["text"] for c in chunks]
        embeddings = self.embed_batch(texts)

        chunks_data = []
        for i, chunk in enumerate(chunks):
            data = {
                "patient_id": patient_id,
                "medical_file_id": file_id,
                "encounter_id": encounter_id,
                "extraction_id": extraction_id,
                "chunk_text": chunk["text"],
                "chunk_index": chunk.get("index", i),
                "metadata": chunk.get("metadata", {}),
            }
            if embeddings and i < len(embeddings):
                data["embedding"] = embeddings[i]
            chunks_data.append(data)

        await doc_repo.create_chunks_batch(chunks_data)
        await session.commit()
        logger.info(f"Stored {len(chunks_data)} chunks for file {file_id}")
