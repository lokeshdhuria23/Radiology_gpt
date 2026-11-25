from uuid import UUID
from typing import Optional, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models.document import MedicalFile, DocumentExtraction, DocumentChunk


class DocumentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_file(self, **kwargs) -> MedicalFile:
        f = MedicalFile(**kwargs)
        self.session.add(f)
        await self.session.flush()
        await self.session.refresh(f)
        return f

    async def list_for_patient(self, patient_id: UUID) -> List[MedicalFile]:
        result = await self.session.execute(
            select(MedicalFile).where(MedicalFile.patient_id == patient_id).order_by(MedicalFile.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, file_id: UUID) -> Optional[MedicalFile]:
        result = await self.session.execute(select(MedicalFile).where(MedicalFile.id == file_id))
        return result.scalar_one_or_none()

    async def update_processing_status(self, file_id: UUID, status: str, error: Optional[str] = None):
        result = await self.session.execute(select(MedicalFile).where(MedicalFile.id == file_id))
        f = result.scalar_one_or_none()
        if f:
            f.processing_status = status
            if error:
                f.metadata = {**(f.metadata or {}), "processing_error": error}
            await self.session.flush()
        return f

    async def delete_file(self, file_id: UUID) -> bool:
        result = await self.session.execute(select(MedicalFile).where(MedicalFile.id == file_id))
        f = result.scalar_one_or_none()
        if f:
            await self.session.delete(f)
            await self.session.flush()
            return True
        return False

    async def create_extraction(self, **kwargs) -> DocumentExtraction:
        ext = DocumentExtraction(**kwargs)
        self.session.add(ext)
        await self.session.flush()
        await self.session.refresh(ext)
        return ext

    async def get_extractions(self, file_id: UUID) -> List[DocumentExtraction]:
        result = await self.session.execute(
            select(DocumentExtraction).where(DocumentExtraction.medical_file_id == file_id)
        )
        return list(result.scalars().all())

    async def create_chunk(self, **kwargs) -> DocumentChunk:
        chunk = DocumentChunk(**kwargs)
        self.session.add(chunk)
        await self.session.flush()
        return chunk

    async def create_chunks_batch(self, chunks_data: list):
        for c in chunks_data:
            self.session.add(DocumentChunk(**c))
        await self.session.flush()
