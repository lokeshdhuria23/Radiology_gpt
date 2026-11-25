import re
from app.core.logging import get_logger

logger = get_logger(__name__)

CATEGORY_KEYWORDS = {
    "lab_report": [
        "cbc", "complete blood count", "metabolic panel", "urinalysis", "hemoglobin",
        "hematocrit", "glucose", "creatinine", "bun", "electrolytes", "lipid panel",
        "thyroid", "lab result", "clinical laboratory", "specimen", "wbc count",
        "platelet", "platelets", "troponin", "crp", "procalcitonin", "serum",
        "ref range", "fasting glucose", "blood urea"
    ],
    "prescription": [
        "rx", "prescription", "dispense", "refill", "sig:", "take ",
        "capsule", "tablet", "mg daily", "mg twice", "po daily"
    ],
    "discharge_summary": [
        "discharge summary", "discharge instructions", "admitted on",
        "discharged on", "discharge diagnosis", "hospital course"
    ],
    "imaging_report": [
        "radiology", "x-ray", "ct scan", "mri", "ultrasound", "mammogram",
        "impression:", "findings:", "radiologist", "dicom", "xray",
        "chest radiograph", "scan", "cxr", "paranasal", "sinus", "anatomical",
        "diagnostic medical scan", "image specification", "lung fields", "cardiothoracic"
    ],
    "clinical_note": [
        "progress note", "clinic note", "assessment and plan", "review of systems",
        "physical examination", "chief complaint", "hpi", "soap note"
    ],
    "referral": [
        "referral", "refer to", "consultation request", "requesting physician"
    ],
    "pathology": [
        "pathology", "biopsy", "histology", "cytology"
    ],
}


def classify(text: str, filename: str = "") -> str:
    combined = (text[:3000] + " " + filename).lower()

    # Priority 1: Check lab keywords
    lab_matches = sum(1 for kw in CATEGORY_KEYWORDS["lab_report"] if kw in combined)
    if lab_matches >= 2 or ("clinical laboratory" in combined or "wbc count" in combined):
        return "lab_report"

    # Priority 2: Check matching across all categories
    scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in combined)
        if score > 0:
            scores[category] = score

    if scores:
        return max(scores, key=scores.get)

    # Priority 3: Fallback for image files
    fn_lower = filename.lower()
    if any(fn_lower.endswith(ext) for ext in (".png", ".jpg", ".jpeg", ".tiff", ".dcm")) or "whatsapp image" in fn_lower or "scan" in fn_lower:
        return "imaging_report"

    return "clinical_note"
