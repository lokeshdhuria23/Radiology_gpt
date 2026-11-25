import re
from typing import List, Dict, Optional
from app.core.logging import get_logger

logger = get_logger(__name__)

MEDICAL_SECTION_HEADERS = re.compile(
    r"(?:^|\n)\s*(?:FINDINGS|IMPRESSION|HISTORY|MEDICATIONS|ASSESSMENT|PLAN|"
    r"SUBJECTIVE|OBJECTIVE|DIAGNOSIS|RESULTS|CONCLUSION|RECOMMENDATIONS|"
    r"CHIEF COMPLAINT|HPI|REVIEW OF SYSTEMS|PHYSICAL EXAMINATION|"
    r"LABORATORY|IMAGING|PROCEDURES|FOLLOW[- ]UP|DISCHARGE)\s*[:\-]?",
    re.IGNORECASE | re.MULTILINE,
)


class TextChunker:
    @staticmethod
    def chunk_text(text: str, strategy: str = "medical", chunk_size: int = 512, overlap: int = 50) -> List[Dict]:
        if strategy == "medical":
            return TextChunker._chunk_medical(text, chunk_size, overlap)
        elif strategy == "semantic":
            return TextChunker._chunk_semantic(text, chunk_size, overlap)
        else:
            return TextChunker._chunk_fixed(text, chunk_size, overlap)

    @staticmethod
    def _chunk_fixed(text: str, chunk_size: int, overlap: int) -> List[Dict]:
        words = text.split()
        chunks = []
        i = 0
        idx = 0
        while i < len(words):
            chunk_words = words[i:i + chunk_size]
            chunk_text = " ".join(chunk_words)
            if chunk_text.strip():
                chunks.append({"text": chunk_text, "index": idx, "section": None, "metadata": {}})
                idx += 1
            i += chunk_size - overlap
        return chunks

    @staticmethod
    def _chunk_medical(text: str, chunk_size: int, overlap: int) -> List[Dict]:
        sections = MEDICAL_SECTION_HEADERS.split(text)
        headers = MEDICAL_SECTION_HEADERS.findall(text)
        chunks = []
        idx = 0
        for i, section in enumerate(sections):
            section = section.strip()
            if not section:
                continue
            header = headers[i - 1].strip().strip(":- ") if i > 0 and i - 1 < len(headers) else "General"
            # Sub-chunk if too large
            words = section.split()
            if len(words) <= chunk_size:
                chunks.append({"text": section, "index": idx, "section": header, "metadata": {"section_header": header}})
                idx += 1
            else:
                sub_chunks = TextChunker._chunk_fixed(section, chunk_size, overlap)
                for sc in sub_chunks:
                    sc["section"] = header
                    sc["index"] = idx
                    sc["metadata"]["section_header"] = header
                    chunks.append(sc)
                    idx += 1
        if not chunks and text.strip():
            chunks = TextChunker._chunk_fixed(text, chunk_size, overlap)
        return chunks

    @staticmethod
    def _chunk_semantic(text: str, chunk_size: int, overlap: int) -> List[Dict]:
        paragraphs = re.split(r"\n\s*\n", text)
        chunks = []
        idx = 0
        buffer = ""
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            if len((buffer + " " + para).split()) > chunk_size and buffer:
                chunks.append({"text": buffer.strip(), "index": idx, "section": None, "metadata": {}})
                idx += 1
                words = buffer.split()
                buffer = " ".join(words[-overlap:]) + " " + para if overlap > 0 else para
            else:
                buffer = (buffer + " " + para).strip()
        if buffer.strip():
            chunks.append({"text": buffer.strip(), "index": idx, "section": None, "metadata": {}})
        return chunks
