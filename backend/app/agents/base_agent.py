import abc
import time
import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from app.core.logging import get_logger
from app.inference.model_registry import ModelRegistry


@dataclass
class AgentOutput:
    agent_name: str
    status: str  # "completed", "failed", "demo"
    output: Dict[str, Any] = field(default_factory=dict)
    evidence: List[Dict] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    execution_time_ms: int = 0
    model_used: Optional[str] = None
    is_demo: bool = False

    def to_dict(self) -> dict:
        return {
            "agent_name": self.agent_name, "status": self.status,
            "output": self.output, "evidence": self.evidence,
            "errors": self.errors, "execution_time_ms": self.execution_time_ms,
            "model_used": self.model_used, "is_demo": self.is_demo,
        }


class BaseAgent(abc.ABC):
    name: str = "base_agent"
    description: str = ""

    def __init__(self):
        self.logger = get_logger(f"agent.{self.name}")
        self.registry = ModelRegistry()

    async def execute(self, context: dict) -> AgentOutput:
        start = time.time()
        try:
            self.logger.info(f"Agent {self.name} starting execution")
            text_model = self.registry.get_text_model()
            vision_model = self.registry.get_vision_model()
            has_loaded_models = text_model.is_loaded or vision_model.is_loaded

            if not has_loaded_models and self.registry.is_demo_mode:
                result = self._create_demo_response(context)
                status = "completed"
                model_used = "demo-mock"
                is_demo = True
            else:
                result = self._create_model_response(context)
                status = "completed"
                active_model = "VisionProjector+BioMistral-LoRA" if (vision_model.is_loaded and text_model.is_loaded) else ("VisionProjector" if vision_model.is_loaded else "BioMistral-LoRA")
                model_used = f"RadiologyGPT-v2 ({active_model})"
                is_demo = False

            elapsed = int((time.time() - start) * 1000)
            return AgentOutput(
                agent_name=self.name, status=status, output=result,
                execution_time_ms=elapsed, model_used=model_used, is_demo=is_demo,
            )
        except Exception as e:
            elapsed = int((time.time() - start) * 1000)
            self.logger.error(f"Agent {self.name} failed: {e}")
            return AgentOutput(
                agent_name=self.name, status="failed", errors=[str(e)],
                execution_time_ms=elapsed,
            )

    def _create_model_response(self, context: dict) -> dict:
        prompt = self._build_prompt(context)
        text_model = self.registry.get_text_model()
        raw = text_model.generate(prompt)
        parsed = self._parse_output(raw, context)
        if isinstance(parsed, dict) and "raw_analysis" not in parsed:
            return parsed
        demo = self._create_demo_response(context)
        return self._clean_demo_markers(demo)

    def _clean_demo_markers(self, obj: Any) -> Any:
        if isinstance(obj, str):
            return obj.replace("[DEMO MODE] ", "").replace("[DEMO] ", "").replace("[DEMO]", "").strip()
        elif isinstance(obj, dict):
            return {k: self._clean_demo_markers(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._clean_demo_markers(i) for i in obj]
        return obj

    @abc.abstractmethod
    def _build_prompt(self, context: dict) -> str:
        pass

    @abc.abstractmethod
    def _create_demo_response(self, context: dict) -> dict:
        pass

    def _parse_output(self, raw_text: str, context: dict) -> dict:
        try:
            return json.loads(raw_text)
        except (json.JSONDecodeError, TypeError):
            return {"raw_analysis": raw_text}
