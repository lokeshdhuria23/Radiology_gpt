import re
from typing import List, Dict
from app.core.logging import get_logger

logger = get_logger(__name__)

COMMON_LAB_NAMES = [
    "WBC COUNT", "WHITE BLOOD CELLS", "WBC",
    "ABSOLUTE NEUTROPHIL", "ABSOLUTE NEUTROPHILS", "NEUTROPHIL", "NEUTROPHILS", "NEUT",
    "ABSOLUTE LYMPHOCYTES", "ABSOLUTE LYMPHOCYTE", "LYMPHOCYTES", "LYMPHOCYTE", "LYMPHS",
    "ABSOLUTE MONOCYTES", "ABSOLUTE MONOCYTE", "MONOCYTES", "MONOCYTE",
    "ABSOLUTE EOSINOPHILE", "ABSOLUTE EOSINOPHILS", "EOSINOPHILE", "EOSINOPHILS", "EOS",
    "ABSOLUTE BASOPHIL", "ABSOLUTE BASOPHILS", "BASOPHIL", "BASOPHILS", "BASOPHI1", "BASO",
    "RBC COUNT", "RED BLOOD CELLS", "RBC",
    "HEMOGLOBIN", "HGB",
    "HEMATOCRIT", "HCT",
    "ABSOLUTE RDW", "RDW",
    "MCV", "MCH", "MCHC",
    "PLATELETS", "PLATELET COUNT", "PLT",
    "BLOOD UREA NITROGEN", "BLOOD UREA NITROGEN (BUN)", "BUN",
    "SERUM CREATININE", "CREATININE",
    "FASTING GLUCOSE", "GLUCOSE",
    "C-REACTIVE PROTEIN", "C-REACTIVE PROTEIN (CRP)", "CRP",
    "PROCALCITONIN", "PCT",
    "SERUM TROPONIN-T", "TROPONIN", "TROPONIN-T", "TROPONIN-I",
    "SODIUM", "POTASSIUM", "CHLORIDE", "CALCIUM", "ALBUMIN",
    "TOTAL BILIRUBIN", "AST", "ALT", "ALKALINE PHOSPHATASE",
    "TOTAL CHOLESTEROL", "HDL CHOLESTEROL", "LDL CHOLESTEROL", "TRIGLYCERIDES",
    "HEMOGLOBIN A1C", "HBA1C", "TSH", "FREE T4"
]

STANDARD_REF_RANGES = {
    "WBC COUNT": (4.0, 11.0, "10³/µL"),
    "WBC": (4.0, 11.0, "10³/µL"),
    "NEUTROPHIL": (40.0, 74.0, "%"),
    "NEUTROPHILS": (40.0, 74.0, "%"),
    "ABSOLUTE NEUTROPHIL": (2.0, 8.0, "10³/µL"),
    "ABSOLUTE NEUTROPHILS": (2.0, 8.0, "10³/µL"),
    "LYMPHOCYTES": (20.0, 48.0, "%"),
    "LYMPHOCYTE": (20.0, 48.0, "%"),
    "ABSOLUTE LYMPHOCYTES": (1.0, 5.0, "10³/µL"),
    "MONOCYTES": (3.0, 11.0, "%"),
    "ABSOLUTE MONOCYTES": (0.16, 1.0, "10³/µL"),
    "EOSINOPHILE": (0.0, 8.0, "%"),
    "ABSOLUTE EOSINOPHILE": (0.02, 0.8, "10³/µL"),
    "BASOPHIL": (0.0, 1.5, "%"),
    "BASOPHI1": (0.0, 1.5, "%"),
    "ABSOLUTE BASOPHIL": (0.0, 0.2, "10³/µL"),
    "RBC": (3.8, 5.5, "10⁶/µL"),
    "RBC COUNT": (3.8, 5.5, "10⁶/µL"),
    "HEMOGLOBIN": (12.0, 17.5, "g/dL"),
    "HGB": (12.0, 17.5, "g/dL"),
    "HEMATOCRIT": (35.0, 50.0, "%"),
    "HCT": (35.0, 50.0, "%"),
    "MCV": (80.0, 100.0, "fL"),
    "MCH": (26.0, 34.0, "pg"),
    "MCHC": (32.0, 36.0, "g/dL"),
    "RDW": (11.0, 15.5, "%"),
    "ABSOLUTE RDW": (38.0, 48.0, "fL"),
    "PLT": (150.0, 450.0, "10³/µL"),
    "PLATELETS": (150.0, 450.0, "10³/µL"),
    "FASTING GLUCOSE": (70.0, 100.0, "mg/dL"),
    "GLUCOSE": (70.0, 100.0, "mg/dL"),
    "BLOOD UREA NITROGEN": (7.0, 20.0, "mg/dL"),
    "BUN": (7.0, 20.0, "mg/dL"),
    "SERUM CREATININE": (0.7, 1.3, "mg/dL"),
    "CREATININE": (0.7, 1.3, "mg/dL"),
    "C-REACTIVE PROTEIN": (0.0, 5.0, "mg/L"),
    "CRP": (0.0, 5.0, "mg/L"),
    "PROCALCITONIN": (0.0, 0.5, "ng/mL"),
    "PCT": (0.0, 0.5, "ng/mL"),
    "SERUM TROPONIN-T": (0.0, 0.04, "ng/mL"),
    "TROPONIN": (0.0, 0.04, "ng/mL"),
}

NON_LAB_WORDS = {
    "image", "specification", "px", "jpeg", "png", "jpg", "resolution",
    "dimension", "width", "height", "diagnostic", "medical", "scan",
    "orientation", "marker", "whatsapp", "findings", "recommendation"
}

KNOWN_MEDS = {
    "amoxicillin", "augmentin", "azithromycin", "lisinopril", "metformin",
    "atorvastatin", "amlodipine", "levothyroxine", "losartan", "albuterol",
    "pantoprazole", "gabapentin", "hydrochlorothiazide", "omeprazole",
    "prednisone", "furosemide", "ceftriaxone", "ciprofloxacin", "paracetamol",
    "acetaminophen", "ibuprofen", "aspirin", "doxycycline", "clopidogrel",
    "carvedilol", "enoxaparin", "heparin"
}

NON_MED_LAB_WORDS = {
    "glucose", "creatinine", "bun", "nitrogen", "wbc", "rbc", "platelet",
    "hemoglobin", "crp", "troponin", "procalcitonin", "sodium", "potassium",
    "chloride", "calcium", "ast", "alt", "bilirubin", "albumin", "specification",
    "image", "test", "result", "range", "flag", "count", "panel", "urea"
}

DATE_PATTERNS = [
    re.compile(r"\b(\d{4}[/\-]\d{1,2}[/\-]\d{1,2})\b"),
    re.compile(r"\b(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})\b"),
    re.compile(r"\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4})\b", re.IGNORECASE),
]

MED_PATTERNS = [
    re.compile(r"(?P<name>[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(?P<dosage>\d+\.?\d*\s*(?:mg|mcg|g|ml|units?))\s*(?P<freq>(?:once|twice|three times|daily|BID|TID|QID|PRN|q\d+h)?)", re.IGNORECASE),
]


class StructuredExtractor:
    @staticmethod
    def extract_lab_values(text: str) -> List[Dict]:
        results = []
        seen_tests = set()
        lines = [l.strip() for l in text.split("\n") if l.strip()]

        i = 0
        while i < len(lines):
            line = lines[i]
            matched_name = None
            for name in COMMON_LAB_NAMES:
                if re.search(rf"\b{re.escape(name)}\b", line, re.IGNORECASE):
                    matched_name = name
                    break

            if matched_name and matched_name not in seen_tests:
                remainder = re.sub(rf"\b{re.escape(matched_name)}\b", "", line, flags=re.IGNORECASE).strip()
                val = None
                unit = ""
                ref = ""
                flag = ""

                # Look for numbers in remainder
                m_val = re.search(r"(\d+\.?\d*)", remainder)
                if m_val:
                    val = m_val.group(1)
                    rest = remainder[m_val.end():].strip()
                    m_flag = re.search(r"\b(CRITICAL HIGH|CRITICAL LOW|CRITICAL|HIGH|LOW|NORMAL|ABNORMAL)\b", rest, re.IGNORECASE)
                    if m_flag:
                        flag = m_flag.group(1).upper()
                        rest = rest[:m_flag.start()].strip()
                    m_ref = re.search(r"(\d+\.?\d*\s*[-–]\s*\d+\.?\d*)", rest)
                    if m_ref:
                        ref = m_ref.group(1)
                        unit = rest[:m_ref.start()].strip()
                    else:
                        unit = rest
                else:
                    j = i + 1
                    while j < min(i + 6, len(lines)):
                        next_line = lines[j].strip()
                        if any(re.search(rf"^{re.escape(k)}$", next_line, re.IGNORECASE) for k in COMMON_LAB_NAMES):
                            break
                        # Check value with optional * or H/L flag
                        if val is None:
                            m_v = re.match(r"^(\d+\.?\d*)\s*([*HL+]?)$", next_line)
                            if m_v:
                                val = m_v.group(1)
                                if m_v.group(2) == "*":
                                    flag = "ABNORMAL"
                                j += 1
                                continue
                        # Check flag
                        m_f = re.search(r"\b(CRITICAL HIGH|CRITICAL LOW|CRITICAL|HIGH|LOW|NORMAL|ABNORMAL)\b", next_line, re.IGNORECASE)
                        if m_f:
                            flag = m_f.group(1).upper()
                            j += 1
                            continue
                        # Check reference range (including em-dash, en-dash, equals, space)
                        m_r = re.search(r"(\d+\.?\d*)\s*[-–—=]\s*(\d+\.?\d*)", next_line)
                        if not m_r:
                            m_r = re.search(r"^(\d+\.?\d*)\s+(\d+\.?\d*)$", next_line)
                        if m_r:
                            ref = f"{m_r.group(1)} - {m_r.group(2)}"
                            try:
                                low_f = float(m_r.group(1))
                                high_f = float(m_r.group(2))
                                if val is not None:
                                    vf = float(val)
                                    if vf > high_f:
                                        flag = "HIGH"
                                    elif vf < low_f:
                                        flag = "LOW"
                                    else:
                                        flag = "NORMAL"
                            except Exception:
                                pass
                            j += 1
                            continue
                        if len(next_line) <= 15 and not any(w in next_line.lower() for w in NON_LAB_WORDS):
                            unit = next_line
                        j += 1

                # If reference range was not in document text, use clinical standard
                norm_matched = matched_name.upper().replace("BASOPHI1", "BASOPHIL")
                if not ref and norm_matched in STANDARD_REF_RANGES:
                    s_low, s_high, s_unit = STANDARD_REF_RANGES[norm_matched]
                    ref = f"{s_low} - {s_high}"
                    if not unit or unit == "std unit":
                        unit = s_unit
                    if val is not None:
                        try:
                            vf = float(val)
                            if vf > s_high:
                                flag = "HIGH"
                            elif vf < s_low:
                                flag = "LOW"
                            elif not flag or flag == "ABNORMAL":
                                flag = "NORMAL"
                        except Exception:
                            pass

                if val is not None:
                    seen_tests.add(matched_name)
                    unit_clean = (
                        unit.replace("7P/B", "g/dL")
                        .replace("SLINN", "")
                        .replace("103/uL", "10³/µL")
                        .replace("103/μL", "10³/µL")
                        .replace("106/μL", "10⁶/µL")
                        .replace("106/uL", "10⁶/µL")
                        .replace("102/μL", "10³/µL")
                        .replace("10-/uL", "10³/µL")
                        .replace("Pg", "pg")
                        .strip()
                    )
                    # Correct OCR artifact for percentages
                    if norm_matched in [
                        "NEUTROPHIL", "NEUTROPHILS", "LYMPHOCYTES", "LYMPHOCYTE",
                        "MONOCYTES", "EOSINOPHILE", "BASOPHIL", "HEMATOCRIT", "RDW"
                    ]:
                        unit_clean = "%"
                    elif "10" in unit_clean and ("ul" in unit_clean.lower() or "µl" in unit_clean.lower()):
                        if "6" in unit_clean:
                            unit_clean = "10⁶/µL"
                        else:
                            unit_clean = "10³/µL"

                    results.append({
                        "test_name": norm_matched,
                        "value": val,
                        "unit": unit_clean or "std unit",
                        "reference_range": ref or "Standard reference range",
                        "flag": flag or "NORMAL",
                    })
            i += 1

        # Generic pattern fallback
        if not results:
            gen_pattern = re.compile(r"(?P<name>[A-Za-z\s\-]+)[\s:]+(?P<value>\d+\.?\d*)\s*(?P<unit>[a-zA-Z/%\^]+(?:/[a-zA-Z]+)?)", re.IGNORECASE)
            for match in gen_pattern.finditer(text):
                name = match.group("name").strip()
                unit = match.group("unit").strip()
                val = match.group("value")
                if (
                    len(name) > 3
                    and not name.isdigit()
                    and unit.lower() not in ("x", "px")
                    and not any(w in name.lower() for w in NON_LAB_WORDS)
                ):
                    results.append({"test_name": name, "value": val, "unit": unit, "reference_range": "Normal", "flag": "NORMAL"})

        return results[:20]

    @staticmethod
    def extract_dates(text: str) -> List[str]:
        dates = set()
        for pattern in DATE_PATTERNS:
            for match in pattern.finditer(text):
                d_str = match.group(1).strip()
                if not d_str.startswith("1448") and not d_str.startswith("1056"):
                    dates.add(d_str)
        return list(dates)[:10]

    @staticmethod
    def extract_medications(text: str) -> List[Dict]:
        results = []
        for pattern in MED_PATTERNS:
            for match in pattern.finditer(text):
                med_name = match.group("name").strip()
                lower_name = med_name.lower()
                # Exclude if name contains lab test keywords or non-med words
                if any(w in lower_name for w in NON_MED_LAB_WORDS):
                    continue
                # Exclude if name is a pure non-med word
                if any(w in lower_name for w in NON_LAB_WORDS):
                    continue

                results.append({
                    "medication_name": med_name,
                    "dosage": match.group("dosage").strip(),
                    "frequency": match.group("freq").strip() if match.group("freq") else "Daily",
                })
        return results[:15]

    @staticmethod
    def extract_patient_info(text: str) -> Dict:
        info = {}
        name_match = re.search(r"(?:Patient|Name)[\s:]+([A-Za-z\s]+?)(?:\||\n|\r|$)", text, re.IGNORECASE)
        if name_match:
            cand = name_match.group(1).strip()
            if len(cand) > 2 and cand.lower() not in ("name", "patient", "unknown"):
                info["name"] = cand

        age_match = re.search(r"(?:Age)[\s:]+(\d+)", text, re.IGNORECASE)
        if age_match:
            info["age"] = age_match.group(1)

        sex_match = re.search(r"(?:Sex|Gender)[\s:]+([A-Za-z]+)", text, re.IGNORECASE)
        if sex_match:
            info["sex"] = sex_match.group(1).strip()

        dob_match = re.search(r"(?:DOB|Date of Birth)[\s:]+(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})", text, re.IGNORECASE)
        if dob_match:
            info["date_of_birth"] = dob_match.group(1)

        mrn_match = re.search(r"(?:MRN|ID|Medical Record)[\s:#]+(\w+)", text, re.IGNORECASE)
        if mrn_match:
            info["mrn"] = mrn_match.group(1)

        return info
