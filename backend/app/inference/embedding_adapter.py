from pathlib import Path
from typing import Optional, List
import numpy as np
from app.inference.base_adapter import BaseModelAdapter
from app.core.logging import get_logger

logger = get_logger(__name__)


class EmbeddingModelAdapter(BaseModelAdapter):
    """Adapter for embedding models using FastEmbed (ONNX) with sentence-transformers compatibility."""

    def __init__(self, model_path=None, device="cpu", config=None):
        super().__init__(model_path, device, config)
        self.dimension = (config or {}).get("dimension", 384)
        self._model = None

    def load_model(self) -> None:
        try:
            from fastembed import TextEmbedding
            logger.info("Initializing FastEmbed 'BAAI/bge-small-en-v1.5' (384 dimensions)...")
            self._model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
            self.dimension = 384
            self._loaded = True
            logger.info(f"FastEmbed embedding model loaded successfully (dim={self.dimension})")
        except Exception as e:
            logger.error(f"Failed to load FastEmbed model: {e}")
            self._loaded = False

    def predict(self, input_data):
        if isinstance(input_data, list):
            return self.embed_batch(input_data)
        return self.embed_text(input_data)

    def embed_text(self, text: str) -> Optional[List[float]]:
        if not self._loaded or not self._model:
            return None
        try:
            embeddings = list(self._model.embed([text]))
            return embeddings[0].tolist() if embeddings else None
        except Exception as e:
            logger.error(f"Embedding failed: {e}")
            return None

    def embed_batch(self, texts: List[str]) -> Optional[List[List[float]]]:
        if not self._loaded or not self._model:
            return None
        try:
            embeddings = list(self._model.embed(texts))
            return [e.tolist() for e in embeddings]
        except Exception as e:
            logger.error(f"Batch embedding failed: {e}")
            return None
