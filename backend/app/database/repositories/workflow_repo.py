from uuid import UUID
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models.ai_workflow import AIWorkflow, AgentRun, ClinicalFinding


class WorkflowRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, **kwargs) -> AIWorkflow:
        wf = AIWorkflow(**kwargs)
        self.session.add(wf)
        await self.session.flush()
        await self.session.refresh(wf)
        return wf

    async def get_by_id(self, workflow_id: UUID) -> Optional[AIWorkflow]:
        result = await self.session.execute(select(AIWorkflow).where(AIWorkflow.id == workflow_id))
        return result.scalar_one_or_none()

    async def update_status(self, workflow_id: UUID, status: str, error: Optional[str] = None, completed_at: Optional[datetime] = None):
        result = await self.session.execute(select(AIWorkflow).where(AIWorkflow.id == workflow_id))
        wf = result.scalar_one_or_none()
        if wf:
            wf.workflow_status = status
            if error:
                wf.error_message = error
            if completed_at:
                wf.completed_at = completed_at
            if status == "running" and not wf.started_at:
                wf.started_at = datetime.now(timezone.utc)
            await self.session.flush()
        return wf

    async def list_for_encounter(self, encounter_id: UUID) -> List[AIWorkflow]:
        result = await self.session.execute(
            select(AIWorkflow).where(AIWorkflow.encounter_id == encounter_id).order_by(AIWorkflow.created_at.desc())
        )
        return list(result.scalars().all())

    async def create_agent_run(self, **kwargs) -> AgentRun:
        run = AgentRun(**kwargs)
        self.session.add(run)
        await self.session.flush()
        await self.session.refresh(run)
        return run

    async def update_agent_run(self, run_id: UUID, **kwargs):
        result = await self.session.execute(select(AgentRun).where(AgentRun.id == run_id))
        run = result.scalar_one_or_none()
        if run:
            for k, v in kwargs.items():
                if v is not None:
                    setattr(run, k, v)
            await self.session.flush()
        return run

    async def get_agent_runs(self, workflow_id: UUID) -> List[AgentRun]:
        result = await self.session.execute(
            select(AgentRun).where(AgentRun.workflow_id == workflow_id).order_by(AgentRun.created_at)
        )
        return list(result.scalars().all())

    async def create_finding(self, **kwargs) -> ClinicalFinding:
        f = ClinicalFinding(**kwargs)
        self.session.add(f)
        await self.session.flush()
        return f
