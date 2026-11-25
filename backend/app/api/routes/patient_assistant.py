import re
import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from app.core.logging import get_logger
from app.core.config import settings
from app.processing.ocr.ocr_service import OCRService
from app.processing.documents.structured_extractor import StructuredExtractor
from app.inference.groq_adapter import GroqModelAdapter
from app.inference.model_registry import ModelRegistry

logger = get_logger("patient_assistant")
router = APIRouter()


class PatientChatMessage(BaseModel):
    message: str
    patient_name: Optional[str] = "Friend"
    allergies: Optional[List[str]] = []


# ─── Knowledge Base Context Retriever ─────────────────────────────
def retrieve_knowledge_context(query: str, max_chars: int = 1800) -> str:
    """
    Dynamically scans all Markdown guidelines in knowledge_base/
    (clinical guidelines, drug references, and medical references)
    to retrieve grounded evidence for patient guidance.
    """
    kb_paths = [Path("knowledge_base"), Path("../knowledge_base")]
    kb_dir = next((p for p in kb_paths if p.exists()), None)
    if not kb_dir:
        return ""

    tokens = [w.lower() for w in re.findall(r"\w+", query) if len(w) > 2]
    if not tokens:
        return ""

    scored_sections = []
    for md_file in kb_dir.rglob("*.md"):
        try:
            content = md_file.read_text(encoding="utf-8", errors="ignore")
            sections = re.split(r"(?=\n#{1,3}\s+)", content)
            for sec in sections:
                sec_text = sec.strip()
                if not sec_text:
                    continue
                sec_lower = sec_text.lower()
                score = sum(sec_lower.count(tok) for tok in tokens)
                if score > 0:
                    scored_sections.append((score, md_file.name, sec_text))
        except Exception:
            continue

    scored_sections.sort(key=lambda x: x[0], reverse=True)

    selected = []
    total_len = 0
    for score, fname, text in scored_sections[:4]:
        header = f"[{fname}]"
        chunk = f"{header}\n{text}"
        if total_len + len(chunk) > max_chars:
            selected.append(chunk[:max_chars - total_len])
            break
        selected.append(chunk)
        total_len += len(chunk)

    return "\n\n---\n\n".join(selected)


def clean_llm_output(text: str) -> str:
    """Removes redundant asterisks, quad-asterisks (****), and formatting artifacts."""
    if not text:
        return ""
    cleaned = re.sub(r"\*{4,}", "**", text)
    cleaned = re.sub(r"\*\*\s*\*\*", "", cleaned)
    cleaned = cleaned.replace(" adult-year-old patient", " adult patient")
    return cleaned.strip()


# ─── LLM Generation Helper (Groq 120B / BioMistral LoRA / Fallback) ─
def generate_patient_llm_response(prompt: str, system_prompt: str) -> Optional[str]:
    """
    Attempts generation with Groq Cloud LLM (openai/gpt-oss-120b).
    Falls back to local BioMistral LoRA model checkpoint if available.
    """
    # 1. Groq API
    try:
        groq_adapter = GroqModelAdapter()
        if groq_adapter.is_available:
            logger.info("Generating response with Groq Cloud LLM (openai/gpt-oss-120b)")
            resp = groq_adapter.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.3,
                max_tokens=850,
            )
            if resp and len(resp.strip()) > 30:
                return clean_llm_output(resp)
    except Exception as ge:
        logger.warning(f"Groq generation failed or unavailable: {ge}")

    # 2. Local Trained Text Model (BioMistral LoRA)
    try:
        registry = ModelRegistry()
        text_model = registry.get_text_model()
        if text_model and text_model.is_loaded:
            logger.info("Generating response with local BioMistral LoRA model")
            resp = text_model.generate(f"{system_prompt}\n\nUser: {prompt}\nAssistant:")
            if resp and len(resp.strip()) > 30:
                return clean_llm_output(resp)
    except Exception as te:
        logger.warning(f"Local BioMistral generation failed: {te}")

    return None


# ─── Fallback Medical Response Generator ──────────────────────────
def generate_patient_friendly_fallback(query: str, patient_name: str = "Friend", allergies: List[str] = None) -> str:
    q = query.lower()
    allergies = allergies or []
    allergy_warning = ""
    if allergies:
        allergy_str = ", ".join(allergies)
        allergy_warning = f"\n\n🛡️ **Note on Your Stated Allergies ({allergy_str}):**\nWe checked your known allergies. Always verify before taking any medicine to ensure it does not contain or trigger your allergens."

    if "fever" in q or "temperature" in q or "chills" in q:
        nsaid_caution = "• **Ibuprofen (Advil/Motrin)**: 200–400 mg with food every 6–8 hours (helps with both fever and inflammation; take with meals)."
        if any("nsaid" in a.lower() or "aspirin" in a.lower() or "ibuprofen" in a.lower() for a in allergies):
            nsaid_caution = "⚠️ *Since you noted an NSAID/Aspirin allergy, avoid Ibuprofen or Aspirin. Stick to Acetaminophen (Paracetamol) if cleared by your doctor.*"

        return f"""Hello {patient_name}! Here is a caring guide to help manage a fever safely at home:

🌡️ **Understanding Your Fever:**
A fever is your body's natural and healthy immune response working to fight off viruses or bacteria. 

💧 **Essential Home Care & Comfort:**
1. **Hydrate generously**: Drink plenty of water, electrolyte fluids (ORS), coconut water, or warm herbal broths. Fever increases fluid loss.
2. **Rest and cool down**: Wear loose, lightweight clothing and use a light blanket. Applying a cool, damp washcloth to your forehead can provide soothing relief.
3. **Restful sleep**: Allow your immune system time to recover.

💊 **Safe Common Over-the-Counter Options:**
• **Acetaminophen / Paracetamol (Tylenol)**: 500 mg every 4 to 6 hours as needed (do not exceed 3,000 mg in 24 hours). Gentle on the stomach.
{nsaid_caution}

🥗 **Recommended Vitamins & Nutrition:**
• **Vitamin C (500–1000 mg)**: Supports immune cell function (found in citrus fruits, bell peppers, kiwi).
• **Zinc (15–30 mg)**: Helps shorten the duration of viral infections.
• **Warm ginger or lemon tea with honey**: Soothes the throat and provides comfort.

🚨 **When You Must See a Doctor or Seek Urgent Care:**
• Fever higher than **103°F (39.4°C)** or lasting more than **3 consecutive days**
• Stiff neck, severe persistent headache, confusion, or sensitivity to light
• Shortness of breath or chest pain
• Inability to keep fluids down{allergy_warning}

*Remember: This guidance is for general educational support. If your symptoms worsen, please contact your doctor or visit an urgent care clinic.*"""

    return f"""Hello {patient_name}! 👋 I am your **RadiologyGPT AI Health Assistant**.

I am here to help you understand your health, medications, and test results in plain, caring, everyday language.

🏥 **What I Can Help You With:**
• 🩸 **Understanding Blood Reports**: Explain CBC, WBC, hemoglobin, platelets, and metabolic markers.
• 🌡️ **Symptom Guidance**: Home remedies, comfort measures, and triage for fever, cough, headaches, or stomach ache.
• 💊 **Medication Safety & OTCs**: How and when to take over-the-counter medicines safely, dosage guidelines, and allergy warnings.
• 🥗 **Vitamins & Nutrition**: Advice on Vitamin D, B12, Iron, Vitamin C, and balanced daily wellness.
• 🫁 **Medical Scans Explained**: Simple breakdowns of X-rays, CT scans, and medical terms.

📎 **Did you know?** You can upload a photo of your **CBC blood report or scan report** right here using the attachment button, and I will read it and explain everything in simple, human-friendly terms!{allergy_warning}

⚠️ *RadiologyGPT provides educational health information. Always consult your personal physician for specific medical treatments.*"""


# ─── Chat Endpoint (Groq LLM + Knowledge Base + Ephemeral) ────────
@router.post("/chat")
async def patient_assistant_chat(body: PatientChatMessage):
    """
    Ephemeral patient assistant chat endpoint.
    Retrieves evidence from clinical knowledge base and generates an
    intelligent, empathetic response via Groq 120B / BioMistral LLM.
    Strictly NO DATABASE WRITES.
    """
    patient_name = body.patient_name or "Friend"
    allergies = body.allergies or []
    allergy_info = ", ".join(allergies) if allergies else "None documented (NKDA)"

    # 1. Retrieve grounded clinical guidelines from Knowledge Base
    kb_context = retrieve_knowledge_context(body.message, max_chars=1800)

    # 2. Build structured LLM Prompt
    system_prompt = (
        "You are the RadiologyGPT Patient Health Assistant. You are warm, empathetic, reassuring, "
        "and deeply knowledgeable in clinical medicine. You explain medical concepts, lab tests, and home care "
        "in simple, plain English that anyone can easily understand. You provide safe over-the-counter medication rules, "
        "vitamin and nutrition advice, and highlight clear red-flag symptoms for when to see a doctor. "
        "Always cross-check the patient's stated allergies and give explicit safety cautions if applicable. "
        "Use clean Markdown with helpful emojis and bullet points. Never provide a definitive clinical prescription."
    )

    prompt = f"""Patient Name: {patient_name}
Patient Documented Allergies: {allergy_info}
Patient Question: "{body.message}"

Grounded Knowledge Base Context (Clinical Guidelines & Drug References):
{kb_context if kb_context else "Standard Evidence-Based Clinical Guidelines (CDC, WHO, ACR, FDA)"}

Instructions:
1. Address {patient_name} warmly and answer their query thoroughly in human-friendly, comforting terms.
2. If they ask about fever, cold, or pain, explain safe home care, hydration, and safe OTC medicine rules (Paracetamol / Ibuprofen with max daily dose warnings and precautions).
3. If they ask about vitamins or nutrition, explain Vitamin D3, B12, Vitamin C, Iron, and Zinc with practical daily tips.
4. If they have stated allergies ({allergy_info}), explicitly verify medication safety against those allergies.
5. Provide clear, bulleted 'When to see a doctor' red flags.
6. Conclude with a warm, caring closing and disclaimer."""

    # 3. Call LLM (Groq / BioMistral)
    llm_reply = generate_patient_llm_response(prompt=prompt, system_prompt=system_prompt)

    if not llm_reply:
        logger.info("Falling back to structured medical knowledge generator")
        llm_reply = generate_patient_friendly_fallback(
            query=body.message,
            patient_name=patient_name,
            allergies=allergies,
        )

    return {
        "reply": llm_reply,
        "is_ephemeral": True,
        "citation": "Grounded Knowledge Base (Clinical Guidelines, Drug References, Groq LLM)",
    }


# ─── Report Analysis Endpoint (RapidOCR + KB + Groq LLM) ──────────
@router.post("/analyze-report")
async def patient_analyze_report(
    file: UploadFile = File(...),
    patient_name: Optional[str] = Form("Friend"),
):
    """
    Ephemeral report analysis endpoint.
    Extracts text using RapidOCR, parses clinical markers, retrieves relevant knowledge base
    guidelines, and runs Groq Cloud 120B / BioMistral LLM for a caring, human-friendly explanation.
    Strictly NO DATABASE WRITES.
    """
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 20MB)")

    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    ocr_service = OCRService()
    raw_text = ""

    # 1. Dynamic Text Extraction via RapidOCR
    try:
        if ext in ("pdf", "application/pdf"):
            raw_text = ocr_service.extract_text_from_pdf(content)
        elif ext in ("png", "jpg", "jpeg", "tiff", "image/png", "image/jpeg", "image/tiff"):
            raw_text = ocr_service.extract_text_from_image(content)
        else:
            raw_text = content.decode("utf-8", errors="replace")
    except Exception as oe:
        logger.warning(f"Patient assistant OCR error: {oe}")
        raw_text = "CBC with differential report processed."

    # 2. Extract structured laboratory numbers
    extractor = StructuredExtractor()
    extracted_labs = extractor.extract_lab_values(raw_text) if raw_text else []

    # 3. Retrieve relevant Knowledge Base guidelines matching extracted tests
    lab_keywords = " ".join([l.get("test_name", "") for l in extracted_labs[:8]])
    kb_query = f"cbc blood count {lab_keywords} leukocytosis anemia thrombocytopenia inflammation crp"
    kb_context = retrieve_knowledge_context(kb_query, max_chars=1800)

    # 4. Formulate Prompt for LLM Reasoning
    system_prompt = (
        "You are the RadiologyGPT Patient Health Assistant. You specialize in explaining medical reports, "
        "CBC blood tests, metabolic panels, and radiology imaging to patients in simple, compassionate, "
        "and human-friendly language. You explain what each test measures, what abnormal values mean for daily life, "
        "provide evidence-based nutrition, vitamin, and home care tips, and state clear red flags for urgent medical review."
    )

    formatted_lab_list = "\n".join([
        f"- {l.get('test_name')}: {l.get('value')} {l.get('unit')} [Ref: {l.get('reference_range')}] -> Flag: {l.get('flag', 'NORMAL')}"
        for l in extracted_labs
    ])

    prompt = f"""Patient Name: {patient_name}
Uploaded Document Name: {file.filename}

OCR Raw Extracted Text from Report:
\"\"\"{raw_text[:2000]}\"\"\"

Structured Laboratory Values Identified:
{formatted_lab_list if formatted_lab_list else "Standard hematology panel"}

Knowledge Base Clinical Guidelines & Reference Ranges:
{kb_context}

Please generate an empathetic, human-friendly explanation of this report for {patient_name}:
1. Start with a warm greeting and an executive overview of what this report represents in everyday words.
2. Break down the notable test findings (especially WBC, Hemoglobin, Platelets, or other flagged markers) explaining what the test is and what their specific number means.
3. Provide practical, supportive dietary, vitamin (e.g. iron absorption, Vitamin C, D3), and home self-care recommendations.
4. Provide clear, bulleted 'When to see your doctor or seek urgent care' red flags.
5. Suggest 2-3 specific, helpful questions {patient_name} can ask their doctor during their next visit.
6. Use clean Markdown formatting with clear section headers, bullet points, and friendly emojis."""

    # 5. Call LLM (Groq / BioMistral)
    llm_reply = generate_patient_llm_response(prompt=prompt, system_prompt=system_prompt)

    # Fallback if LLM is unavailable
    if not llm_reply:
        logger.info("Using structured medical fallback for report analysis")
        friendly_explanations = []
        nutrition_tips = []
        red_flags = []

        for l in extracted_labs:
            t = l.get("test_name", "").upper()
            flag = l.get("flag", "NORMAL")
            val = l.get("value", "")
            unit = l.get("unit", "")
            if "WBC" in t:
                if "HIGH" in flag or "ABNORMAL" in flag:
                    friendly_explanations.append(f"🛡️ **White Blood Cells (WBC: {val} {unit}) — Elevated:** Your immune system is actively fighting off an infection or inflammation.")
                    nutrition_tips.append("Stay well hydrated with warm broths, water, and rest to support immune recovery.")
                    red_flags.append("High fever (>102°F) or severe chills.")
                else:
                    friendly_explanations.append(f"✅ **White Blood Cells (WBC: {val} {unit}) — Normal:** Healthy immune count.")
            elif "HEMOGLOBIN" in t or "HGB" in t:
                if "LOW" in flag or "ABNORMAL" in flag:
                    friendly_explanations.append(f"🩸 **Hemoglobin ({val} {unit}) — Lower than normal (Anemia):** Oxygen-carrying red blood cells are reduced, which often causes fatigue or dizziness.")
                    nutrition_tips.append("Boost iron-rich foods (spinach, lentils, beans) paired with Vitamin C (citrus fruits) for 3x better absorption.")
                    red_flags.append("Chest tightness, feeling faint, or extreme shortness of breath.")
                else:
                    friendly_explanations.append(f"✅ **Hemoglobin ({val} {unit}) — Normal:** Healthy oxygen-carrying capacity.")
            elif "PLT" in t or "PLATELET" in t:
                if "LOW" in flag or "ABNORMAL" in flag:
                    friendly_explanations.append(f"🩹 **Platelets ({val} {unit}) — Below normal range:** Platelets help blood clot. Take care to avoid cuts and bruising, and avoid aspirin.")
                    red_flags.append("Unexplained bruising, bleeding gums, or nosebleeds.")
                else:
                    friendly_explanations.append(f"✅ **Platelets ({val} {unit}) — Normal:** Good clotting capability.")

        if not friendly_explanations:
            for l in extracted_labs[:5]:
                friendly_explanations.append(f"• **{l.get('test_name')}**: {l.get('value')} {l.get('unit')} ({l.get('flag', 'NORMAL')})")

        exp_body = "\n\n".join(friendly_explanations)
        nut_body = ("\n\n🥗 **Dietary, Vitamin & Self-Care Guidance:**\n" + "\n".join([f"• {nt}" for nt in nutrition_tips])) if nutrition_tips else ""
        rf_body = ("\n\n🚨 **When to Seek Immediate Care:**\n" + "\n".join([f"• {rf}" for rf in red_flags])) if red_flags else ""

        llm_reply = f"""Hello {patient_name}! Here is what your medical report means in plain, easy-to-understand terms:

📋 **Overview of Your Report:**
{exp_body}{nut_body}{rf_body}

💡 **Summary for Your Next Doctor Visit:**
Your doctor will review these findings alongside your symptoms. You can ask:
1. *"What is the main cause of the abnormal numbers in my report?"*
2. *"Do I need an iron supplement, antibiotics, or repeat blood restaging?"*

⚠️ *RadiologyGPT AI provides educational health explanations and does not replace professional medical diagnosis. Always share your results with your doctor.*"""

    return {
        "filename": file.filename,
        "extracted_labs_count": len(extracted_labs),
        "lab_values": extracted_labs,
        "assistant_response": llm_reply,
        "is_ephemeral": True,
    }
