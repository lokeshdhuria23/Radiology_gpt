from uuid import UUID
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models.audit import AuditLog


class AuditRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_log(self, **kwargs) -> AuditLog:
        log = AuditLog(**kwargs)
        self.session.add(log)
        await self.session.flush()
        return log

    async def list_logs(self, user_id: Optional[UUID] = None, patient_id: Optional[UUID] = None, limit: int = 50) -> List[AuditLog]:
        query = select(AuditLog)
        if user_id:
            query = query.where(AuditLog.user_id == user_id)
        if patient_id:
            query = query.where(AuditLog.patient_id == patient_id)
        result = await self.session.execute(query.order_by(AuditLog.created_at.desc()).limit(limit))
        return list(result.scalars().all())
