from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.repositories.workflow_repo import WorkflowRepository
from app.core.logging import get_logger

logger = get_logger(__name__)


class WorkflowManager:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = WorkflowRepository(session)

    async def cancel_workflow(self, workflow_id: UUID):
        return await self.repo.update_status(workflow_id, "cancelled")

    async def retry_workflow(self, workflow_id: UUID):
        return await self.repo.update_status(workflow_id, "pending")

    async def get_progress(self, workflow_id: UUID) -> dict:
        wf = await self.repo.get_by_id(workflow_id)
        if not wf:
            return {"error": "Workflow not found"}
        runs = await self.repo.get_agent_runs(workflow_id)
        total = len(runs)
        completed = sum(1 for r in runs if r.execution_status in ("completed", "demo"))
        failed = sum(1 for r in runs if r.execution_status == "failed")
        return {
            "workflow_id": str(wf.id), "status": wf.workflow_status,
            "total_agents": total, "completed": completed, "failed": failed,
            "progress_pct": int((completed / total) * 100) if total > 0 else 0,
            "agent_statuses": {r.agent_name: r.execution_status for r in runs},
        }
