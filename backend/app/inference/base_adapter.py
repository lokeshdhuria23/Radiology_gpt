import abc
from pathlib import Path
from typing import Any, Dict, Optional
from app.core.logging import get_logger

logger = get_logger(__name__)


class BaseModelAdapter(abc.ABC):
    def __init__(self, model_path: Optional[Path] = None, device: str = "cpu", config: Optional[Dict] = None):
        self.model_path = model_path
        self.device = device
        self.config = config or {}
        self._model = None
        self._tokenizer = None
        self._loaded = False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @abc.abstractmethod
    def load_model(self) -> None:
        pass

    def unload_model(self) -> None:
        self._model = None
        self._tokenizer = None
        self._loaded = False
        logger.info(f"{self.__class__.__name__} unloaded")

    @abc.abstractmethod
    def predict(self, input_data: Any) -> Any:
        pass

    def get_info(self) -> Dict:
        return {
            "adapter": self.__class__.__name__,
            "model_path": str(self.model_path) if self.model_path else None,
            "device": self.device,
            "loaded": self._loaded,
        }
