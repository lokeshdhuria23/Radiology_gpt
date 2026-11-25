from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class AgentRunRequest(BaseModel):
    """Request to invoke an individual clinical agent."""

    agent_name: str = Field(..., max_length=100, description="Name of the agent to execute")
    config: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Agent execution hyperparameters and configuration")


class AgentRunResponse(BaseModel):
    """Detailed record of an individual clinical agent execution."""

    id: UUID = Field(..., description="Agent run primary UUID")
    workflow_id: UUID = Field(..., description="Parent AI workflow orchestration UUID")
    patient_id: UUID = Field(..., description="Target patient UUID")
    encounter_id: Optional[UUID] = Field(default=None, description="Associated encounter UUID")
    agent_name: str = Field(..., description="Name of executing agent")
    model_name: Optional[str] = Field(default=None, description="Underlying model checkpoint or version")
    execution_status: str = Field(default="pending", description="Execution state ('pending', 'running', 'completed', 'failed')")
    input_summary: Dict[str, Any] = Field(default_factory=dict, description="Summary of input documents and clinical parameters")
    output_data: Dict[str, Any] = Field(default_factory=dict, description="Structured agent inference and output findings")
    error_message: Optional[str] = Field(default=None, description="Error diagnostics if agent execution failed")
    execution_time_ms: Optional[int] = Field(default=None, description="Wall clock runtime in milliseconds")
    started_at: Optional[datetime] = Field(default=None, description="Execution start timestamp")
    completed_at: Optional[datetime] = Field(default=None, description="Execution completion timestamp")
    created_at: datetime = Field(..., description="Record creation timestamp")

    model_config = ConfigDict(from_attributes=True)


class WorkflowCreate(BaseModel):
    """Request schema to initialize a multi-agent diagnostic workflow."""

    patient_id: UUID = Field(..., description="UUID of the patient")
    encounter_id: Optional[UUID] = Field(default=None, description="Associated encounter UUID")
    workflow_type: str = Field(default="full", max_length=50, description="Workflow pipeline type (e.g. 'full', 'neuro_mri', 'thoracic_ct')")
    config: Optional[Dict[str, Any]] = Field(default_factory=dict, alias="workflow_config", description="Workflow execution parameters")

    model_config = ConfigDict(populate_by_name=True)


class WorkflowResponse(BaseModel):
    """Multi-agent diagnostic orchestration workflow response."""

    id: UUID = Field(..., description="Workflow orchestration UUID")
    patient_id: UUID = Field(..., description="UUID of the patient")
    encounter_id: Optional[UUID] = Field(default=None, description="Associated encounter UUID")
    initiated_by: Optional[UUID] = Field(default=None, description="User UUID who initiated the workflow")
    workflow_type: str = Field(..., description="Type of AI workflow pipeline executed")
    workflow_status: str = Field(..., description="Workflow lifecycle state ('pending', 'running', 'completed', 'failed', 'cancelled')")
    workflow_config: Dict[str, Any] = Field(default_factory=dict, description="Configuration parameters passed to the pipeline")
    started_at: Optional[datetime] = Field(default=None, description="Workflow start timestamp")
    completed_at: Optional[datetime] = Field(default=None, description="Workflow completion timestamp")
    error_message: Optional[str] = Field(default=None, description="Diagnostic error details if failed")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(default=None, description="Last update timestamp")
    agent_runs: List[AgentRunResponse] = Field(default_factory=list, description="List of executed agent steps in this workflow")

    model_config = ConfigDict(from_attributes=True)


class WorkflowStatusResponse(BaseModel):
    """Lightweight polling response schema for workflow progress."""

    id: UUID = Field(..., description="Workflow orchestration UUID")
    status: str = Field(..., description="Overall workflow state")
    agent_statuses: Dict[str, str] = Field(default_factory=dict, description="Map of agent_name to execution status")
    progress_pct: Optional[int] = Field(default=None, ge=0, le=100, description="Percentage of pipeline completed (0-100)")

    model_config = ConfigDict(from_attributes=True)
