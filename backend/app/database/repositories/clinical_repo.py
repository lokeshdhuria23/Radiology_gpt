from uuid import UUID
from typing import Optional, Tuple, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models.clinical import (
    Vital, Condition, Allergy, Medication,
    MedicationOrder, LabResult, ClinicalNote,
)


class _BaseRepo:
    model = None

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_for_patient(self, patient_id: UUID, offset: int = 0, limit: int = 50) -> Tuple[list, int]:
        query = select(self.model).where(self.model.patient_id == patient_id)
        count_q = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_q)).scalar() or 0
        result = await self.session.execute(query.offset(offset).limit(limit).order_by(self.model.created_at.desc()))
        return list(result.scalars().all()), total

    async def get_by_id(self, record_id: UUID):
        result = await self.session.execute(select(self.model).where(self.model.id == record_id))
        return result.scalar_one_or_none()

    async def create(self, **kwargs):
        record = self.model(**kwargs)
        self.session.add(record)
        await self.session.flush()
        await self.session.refresh(record)
        return record

    async def update(self, record_id: UUID, **kwargs):
        result = await self.session.execute(select(self.model).where(self.model.id == record_id))
        record = result.scalar_one_or_none()
        if record:
            for key, value in kwargs.items():
                if value is not None:
                    setattr(record, key, value)
            await self.session.flush()
            await self.session.refresh(record)
        return record


class VitalRepository(_BaseRepo):
    model = Vital

class ConditionRepository(_BaseRepo):
    model = Condition

class AllergyRepository(_BaseRepo):
    model = Allergy

class MedicationRepository(_BaseRepo):
    model = Medication

class MedicationOrderRepository(_BaseRepo):
    model = MedicationOrder

class LabResultRepository(_BaseRepo):
    model = LabResult

class ClinicalNoteRepository(_BaseRepo):
    model = ClinicalNote
