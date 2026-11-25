from uuid import UUID
from typing import Optional, Tuple, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models.encounter import Encounter


class EncounterRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_for_patient(self, patient_id: UUID, offset: int = 0, limit: int = 20) -> Tuple[List[Encounter], int]:
        query = select(Encounter).where(Encounter.patient_id == patient_id)
        count_q = select(func.count()).select_from(query.subquery())
        total = (await self.session.execute(count_q)).scalar() or 0
        result = await self.session.execute(query.offset(offset).limit(limit).order_by(Encounter.encounter_date.desc()))
        return list(result.scalars().all()), total

    async def get_by_id(self, encounter_id: UUID) -> Optional[Encounter]:
        result = await self.session.execute(select(Encounter).where(Encounter.id == encounter_id))
        return result.scalar_one_or_none()

    async def create(self, **kwargs) -> Encounter:
        encounter = Encounter(**kwargs)
        self.session.add(encounter)
        await self.session.flush()
        await self.session.refresh(encounter)
        return encounter

    async def update(self, encounter_id: UUID, **kwargs) -> Optional[Encounter]:
        result = await self.session.execute(select(Encounter).where(Encounter.id == encounter_id))
        encounter = result.scalar_one_or_none()
        if encounter:
            for key, value in kwargs.items():
                if value is not None:
                    setattr(encounter, key, value)
            await self.session.flush()
            await self.session.refresh(encounter)
        return encounter
