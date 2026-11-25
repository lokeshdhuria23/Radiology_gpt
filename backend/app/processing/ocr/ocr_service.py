from app.inference.ocr_adapter import OCRAdapter
from app.core.logging import get_logger

logger = get_logger(__name__)


class OCRService:
    def __init__(self):
        self.adapter = OCRAdapter()

    def extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        return self.adapter.extract_from_pdf_bytes(pdf_bytes)

    def extract_text_from_image(self, image_bytes: bytes) -> str:
        return self.adapter.extract_from_image_bytes(image_bytes)

    def is_available(self) -> bool:
        return self.adapter.is_available()
