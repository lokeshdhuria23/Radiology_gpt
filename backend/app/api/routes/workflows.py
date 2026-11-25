from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.dependencies.auth import get_current_user
from app.database.repositories.workflow_repo import WorkflowRepository
from app.orchestration.orchestrator import ClinicalOrchestrator
from app.orchestration.workflow_manager import WorkflowManager
from app.schemas.workflow import WorkflowCreate, AgentRunRequest

router = APIRouter()


@router.post("/start", status_code=201)
async def start_workflow(body: WorkflowCreate, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    orchestrator = ClinicalOrchestrator(db)
    try:
        workflow_id = await orchestrator.run_full_workflow(
            patient_id=body.patient_id, encounter_id=body.encounter_id,
            initiated_by=user.get("id") or UUID("00000000-0000-0000-0000-000000000000"),
            specialty=body.config.get("specialty", "general_medicine") if body.config else "general_medicine",
            selected_agents=body.config.get("selected_agents") if body.config else None,
        )
        return {"id": str(workflow_id), "workflow_id": str(workflow_id), "status": "started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start workflow: {e}")


@router.get("/{workflow_id}")
async def get_workflow(workflow_id: UUID, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    repo = WorkflowRepository(db)
    wf = await repo.get_by_id(workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    manager = WorkflowManager(db)
    progress = await manager.get_progress(workflow_id)
    runs = await repo.get_agent_runs(workflow_id)
    return {
        "id": str(wf.id), "patient_id": str(wf.patient_id), "encounter_id": str(wf.encounter_id) if wf.encounter_id else None,
        "workflow_type": wf.workflow_type, "workflow_status": wf.workflow_status, "status": wf.workflow_status,
        "started_at": str(wf.started_at) if wf.started_at else None,
        "completed_at": str(wf.completed_at) if wf.completed_at else None,
        "error_message": wf.error_message, "progress": progress,
        "agent_runs": [{
            "id": str(r.id), "agent_name": r.agent_name, "execution_status": r.execution_status,
            "model_name": r.model_name, "execution_time_ms": r.execution_time_ms,
            "output_data": r.output_data, "error_message": r.error_message,
            "started_at": str(r.started_at) if r.started_at else None,
            "completed_at": str(r.completed_at) if r.completed_at else None,
        } for r in runs],
    }


@router.get("/encounter/{encounter_id}")
async def list_workflows(encounter_id: UUID, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    repo = WorkflowRepository(db)
    workflows = await repo.list_for_encounter(encounter_id)
    return {"items": [{
        "id": str(w.id), "workflow_type": w.workflow_type, "workflow_status": w.workflow_status,
        "started_at": str(w.started_at) if w.started_at else None, "completed_at": str(w.completed_at) if w.completed_at else None,
        "created_at": str(w.created_at),
    } for w in workflows]}


@router.post("/{workflow_id}/retry")
async def retry_workflow(workflow_id: UUID, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    manager = WorkflowManager(db)
    await manager.retry_workflow(workflow_id)
    await db.commit()
    return {"message": "Workflow reset to pending"}


@router.post("/{workflow_id}/cancel")
async def cancel_workflow(workflow_id: UUID, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    manager = WorkflowManager(db)
    await manager.cancel_workflow(workflow_id)
    await db.commit()
    return {"message": "Workflow cancelled"}


@router.get("/{workflow_id}/agents")
async def get_agent_runs(workflow_id: UUID, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    repo = WorkflowRepository(db)
    runs = await repo.get_agent_runs(workflow_id)
    result = []
    for r in runs:
        agent_type = r.agent_name.replace("_agent", "")
        is_demo = False
        if r.output_data and isinstance(r.output_data, dict):
            is_demo = r.output_data.get("is_demo", False)
        result.append({
            "id": str(r.id),
            "workflow_id": str(r.workflow_id),
            "agent_type": agent_type,
            "agent_name": r.agent_name,
            "status": r.execution_status,
            "execution_status": r.execution_status,
            "model_used": r.model_name,
            "model_name": r.model_name,
            "execution_time_ms": r.execution_time_ms,
            "output_data": r.output_data,
            "error_message": r.error_message,
            "is_demo_mode": is_demo,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        })
    return result


@router.post("/{workflow_id}/agents/{agent_name}/run")
async def run_single_agent(workflow_id: UUID, agent_name: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    repo = WorkflowRepository(db)
    wf = await repo.get_by_id(workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    orchestrator = ClinicalOrchestrator(db)
    result = await orchestrator.run_single_agent(agent_name, wf.patient_id, wf.encounter_id or wf.patient_id)
    return result.to_dict()
