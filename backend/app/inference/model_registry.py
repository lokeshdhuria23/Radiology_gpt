import threading
from typing import Dict, Optional
from app.core.config import settings
from app.core.logging import get_logger
from app.inference.text_adapter import TextModelAdapter
from app.inference.vision_adapter import VisionModelAdapter
from app.inference.embedding_adapter import EmbeddingModelAdapter
from app.inference.ocr_adapter import OCRAdapter

logger = get_logger(__name__)


class ModelRegistry:
    """Singleton registry for all model adapters. Lazy-loads models on first access."""

    _instance: Optional["ModelRegistry"] = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._text_model: Optional[TextModelAdapter] = None
        self._vision_model: Optional[VisionModelAdapter] = None
        self._embedding_model: Optional[EmbeddingModelAdapter] = None
        self._ocr: Optional[OCRAdapter] = None
        logger.info("ModelRegistry initialized")

    def get_text_model(self) -> TextModelAdapter:
        if self._text_model is None:
            self._text_model = TextModelAdapter(
                model_path=settings.TEXT_MODEL_PATH,
                device=settings.DEVICE,
            )
            if settings.TEXT_MODEL_PATH:
                self._text_model.load_model()
        return self._text_model

    def get_vision_model(self) -> VisionModelAdapter:
        if self._vision_model is None:
            self._vision_model = VisionModelAdapter(
                model_path=settings.VISION_MODEL_PATH,
                device=settings.DEVICE,
            )
            if settings.VISION_MODEL_PATH:
                self._vision_model.load_model()
        return self._vision_model

    def get_embedding_model(self) -> EmbeddingModelAdapter:
        if self._embedding_model is None:
            self._embedding_model = EmbeddingModelAdapter(
                model_path=settings.EMBEDDING_MODEL_PATH,
                device=settings.DEVICE,
                config={"dimension": settings.EMBEDDING_DIMENSION},
            )
            self._embedding_model.load_model()
        return self._embedding_model

    def get_ocr(self) -> OCRAdapter:
        if self._ocr is None:
            self._ocr = OCRAdapter()
        return self._ocr

    @property
    def is_demo_mode(self) -> bool:
        has_models = (
            (self._text_model and self._text_model.is_loaded) or
            (self._vision_model and self._vision_model.is_loaded)
        )
        return not has_models and settings.DEMO_MODE

    def get_status(self) -> Dict:
        text = self._text_model
        vision = self._vision_model
        emb = self._embedding_model
        ocr = self._ocr
        return {
            "demo_mode": self.is_demo_mode,
            "device": settings.DEVICE,
            "text_model": {
                "available": text is not None and text.is_loaded if text else False,
                "path": str(settings.TEXT_MODEL_PATH) if settings.TEXT_MODEL_PATH else None,
            },
            "vision_model": {
                "available": vision is not None and vision.is_loaded if vision else False,
                "path": str(settings.VISION_MODEL_PATH) if settings.VISION_MODEL_PATH else None,
            },
            "embedding_model": {
                "available": emb is not None and emb.is_loaded if emb else False,
                "path": str(settings.EMBEDDING_MODEL_PATH) if settings.EMBEDDING_MODEL_PATH else None,
                "dimension": settings.EMBEDDING_DIMENSION,
            },
            "ocr": {
                "available": ocr.is_available() if ocr else False,
                "tesseract_installed": ocr.is_available() if ocr else False,
            },
            "vector_search_enabled": settings.VECTOR_SEARCH_ENABLED,
        }
