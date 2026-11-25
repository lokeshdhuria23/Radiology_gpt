import shutil
from pathlib import Path
from typing import Optional
from app.core.logging import get_logger

logger = get_logger(__name__)


class OCRAdapter:
    """OCR adapter using RapidOCR (primary), Tesseract, and PyMuPDF."""

    def __init__(self):
        self._rapid_ocr = None
        try:
            from rapidocr_onnxruntime import RapidOCR
            self._rapid_ocr = RapidOCR()
            logger.info("RapidOCR engine initialized successfully")
        except Exception as e:
            logger.warning(f"RapidOCR engine not available: {e}")

        self._tesseract_available = shutil.which("tesseract") is not None
        if not self._tesseract_available and not self._rapid_ocr:
            logger.warning("No OCR engine found in system. Scanned document text extraction will be limited.")

    def is_available(self) -> bool:
        return self._rapid_ocr is not None or self._tesseract_available

    def extract_from_image(self, image_path: str) -> str:
        # Try RapidOCR first
        if self._rapid_ocr:
            try:
                result, _ = self._rapid_ocr(image_path)
                if result:
                    lines = [line[1] for line in result if len(line) > 1 and line[1]]
                    text = "\n".join(lines).strip()
                    if text:
                        return text
            except Exception as e:
                logger.warning(f"RapidOCR file extraction failed: {e}")

        # Fallback to pytesseract
        try:
            from PIL import Image
            import pytesseract
            img = Image.open(image_path)
            text = pytesseract.image_to_string(img)
            return text.strip()
        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            return ""

    def extract_from_image_bytes(self, image_bytes: bytes) -> str:
        # Try RapidOCR first
        if self._rapid_ocr:
            try:
                result, _ = self._rapid_ocr(image_bytes)
                if result:
                    lines = [line[1] for line in result if len(line) > 1 and line[1]]
                    text = "\n".join(lines).strip()
                    if text:
                        return text
            except Exception as e:
                logger.warning(f"RapidOCR bytes extraction failed: {e}")

        # Fallback to pytesseract
        try:
            from PIL import Image
            import pytesseract
            import io
            img = Image.open(io.BytesIO(image_bytes))
            return pytesseract.image_to_string(img).strip()
        except Exception as e:
            logger.error(f"OCR from bytes failed: {e}")
            return ""

    def extract_from_pdf(self, pdf_path: str) -> str:
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(pdf_path)
            full_text = []
            for page in doc:
                text = page.get_text()
                if text.strip():
                    full_text.append(text)
                elif self._tesseract_available:
                    # Scanned page - try OCR
                    pix = page.get_pixmap()
                    img_bytes = pix.tobytes("png")
                    ocr_text = self.extract_from_image_bytes(img_bytes)
                    if ocr_text:
                        full_text.append(ocr_text)
            doc.close()
            return "\n".join(full_text)
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            return ""

    def extract_from_pdf_bytes(self, pdf_bytes: bytes) -> str:
        try:
            import fitz
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            full_text = []
            for page in doc:
                text = page.get_text()
                if text.strip():
                    full_text.append(text)
                elif self._tesseract_available:
                    pix = page.get_pixmap()
                    img_bytes = pix.tobytes("png")
                    ocr_text = self.extract_from_image_bytes(img_bytes)
                    if ocr_text:
                        full_text.append(ocr_text)
            doc.close()
            return "\n".join(full_text)
        except Exception as e:
            logger.error(f"PDF bytes extraction failed: {e}")
            return ""
