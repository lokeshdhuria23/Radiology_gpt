from typing import Dict, Optional
from app.inference.model_registry import ModelRegistry
from app.inference.vision_adapter import VisionModelAdapter
from app.core.logging import get_logger

logger = get_logger(__name__)


class MedicalImageProcessor:
    def __init__(self):
        self.registry = ModelRegistry()

    def process_medical_image(self, image_bytes: bytes, file_type: str) -> Dict:
        try:
            from PIL import Image
            import io

            if file_type in ("dcm", "application/dicom"):
                # Save to temp and convert DICOM
                import tempfile, os
                with tempfile.NamedTemporaryFile(suffix=".dcm", delete=False) as f:
                    f.write(image_bytes)
                    temp_path = f.name
                image = VisionModelAdapter.dicom_to_pil(temp_path)
                metadata = VisionModelAdapter.extract_dicom_metadata(temp_path)
                os.unlink(temp_path)
                if image is None:
                    return {"error": "Failed to convert DICOM to image", "metadata": metadata}
            else:
                image = Image.open(io.BytesIO(image_bytes))
                metadata = {"format": image.format, "size": image.size, "mode": image.mode}

            vision_model = self.registry.get_vision_model()
            analysis = vision_model.analyze_image(image, "Analyze this medical image.")

            return {
                "analysis": analysis,
                "metadata": metadata,
                "image_size": list(image.size) if image else None,
            }
        except Exception as e:
            logger.error(f"Medical image processing failed: {e}")
            return {"error": str(e), "is_demo": True}
