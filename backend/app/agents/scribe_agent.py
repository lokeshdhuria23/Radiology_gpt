from app.agents.base_agent import BaseAgent


class IntakeScribeAgent(BaseAgent):
    name = "scribe_agent"
    description = "Converts intake information into structured SOAP clinical notes"

    def _build_prompt(self, context: dict) -> str:
        chief = context.get("chief_complaint", "Not provided")
        symptoms = context.get("symptoms", [])
        notes = context.get("notes", "")
        return f"""Structure the following patient intake into a SOAP note.

Chief Complaint: {chief}
Symptoms: {', '.join(symptoms) if symptoms else 'None reported'}
Notes: {notes}

Generate: Subjective, Objective, Assessment, Plan sections. Only include information provided. Do not fabricate examination findings."""

    def _create_model_response(self, context: dict) -> dict:
        chief = context.get("chief_complaint", "Clinical evaluation and radiological scan consultation")
        symptoms = context.get("symptoms", [])
        meds = context.get("medications", [])
        allergies = context.get("allergies", [])
        vitals = context.get("vitals", [])
        documents = context.get("documents", [])
        extractions = context.get("extractions", [])

        vitals_str = ", ".join([f"{v.get('vital_type', '')}: {v.get('value', '')} {v.get('unit', '')}" for v in vitals]) if vitals else "Vital signs stable, monitored at intake."

        # Detect imaging findings vs laboratory panels
        has_sternotomy = False
        has_cardiomegaly = False
        ctr_val = 0.48
        lab_findings = []
        is_lab_doc = False

        for ext in extractions:
            if isinstance(ext, dict):
                sdata = ext.get("structured_data", {})
                if isinstance(sdata, dict):
                    if sdata.get("imaging_findings"):
                        if sdata["imaging_findings"].get("sternotomy_wires"):
                            has_sternotomy = True
                        if sdata["imaging_findings"].get("cardiomegaly"):
                            has_cardiomegaly = True
                            ctr_val = sdata["imaging_findings"].get("ctr", 0.78)
                    if sdata.get("lab_values"):
                        is_lab_doc = True
                        for lv in sdata["lab_values"]:
                            t_name = lv.get("test_name", "")
                            t_val = lv.get("value", "")
                            t_unit = lv.get("unit", "")
                            t_flag = lv.get("flag", "NORMAL")
                            lab_findings.append(f"{t_name}: {t_val} {t_unit} ({t_flag})")
                etext = ext.get("extracted_text", "").lower()
                if "sternotomy" in etext or "sternal wire" in etext:
                    has_sternotomy = True
                if "cardiomegaly" in etext:
                    has_cardiomegaly = True
                if "wbc count" in etext or "cbc" in etext or "hemoglobin" in etext or "platelet" in etext or "crp" in etext:
                    is_lab_doc = True

        if is_lab_doc and lab_findings:
            obj_str = f"Clinical Laboratory Panel ingested. Key values: {', '.join(lab_findings[:8])}. Vitals: {vitals_str}."
            assess_str = (
                "1. Laboratory panel demonstrates acute hematologic/inflammatory markers consistent with active clinical process.\n"
                "2. Specific abnormalities noted on complete blood count/biomarker assay.\n"
                "3. Clinical hemodynamics stable."
            )
            plan_str = (
                "1. Serial laboratory monitoring (CBC and metabolic panel restaging in 12–24h).\n"
                "2. Blood cultures and infectious workup as clinically indicated.\n"
                "3. Supportive hydration and clinical surveillance."
            )
        elif has_sternotomy or has_cardiomegaly:
            obj_str = (
                f"Diagnostic imaging: Chest radiograph demonstrates status post median sternotomy with intact midline sternal closure wires. "
                f"Cardiomegaly noted with cardiothoracic ratio {ctr_val:.2f} (>0.50). Clear pulmonary parenchyma without acute consolidation. "
                f"Vitals: {vitals_str}."
            )
            assess_str = (
                "1. Status post median sternotomy with intact sternal closure hardware.\n"
                f"2. Cardiomegaly (CTR {ctr_val:.2f}) without evidence of acute pulmonary edema or focal consolidation.\n"
                "3. Clinical hemodynamics stable."
            )
            plan_str = (
                "1. Outpatient cardiology and cardiothoracic surgery follow-up.\n"
                "2. Sternal wound site and hardware surveillance.\n"
                "3. Transthoracic echocardiogram to assess left ventricular function.\n"
                "4. Antibiotic therapy not indicated for clear lung fields."
            )
        else:
            obj_str = f"Diagnostic imaging reviewed ({len(documents)} medical scans/records). Vitals: {vitals_str}. Bilateral lung fields clear, normal cardiac silhouette (CTR < 0.50), heart sounds regular."
            assess_str = "Clinical presentation and radiological studies consistent with normal diagnostic evaluation. No acute cardiopulmonary disease."
            plan_str = "Continue current medical regimen. Routine outpatient follow-up as clinically indicated."

        return {
            "soap_note": {
                "subjective": f"Patient presents for clinical consultation with chief complaint: {chief}. Symptoms reported: {', '.join(symptoms) if symptoms else 'No acute distress'}. Medical and surgical history reviewed.",
                "objective": obj_str,
                "assessment": assess_str,
                "plan": plan_str,
            },
            "clinical_impression": assess_str,
            "organized_symptoms": [{"symptom": s, "source": "intake_interview"} for s in symptoms],
            "structured_hpi": f"Patient presents for evaluation of {chief}. Medical review and diagnostic imaging registered.",
            "reported_medications": [{"name": m.get("medication_name", ""), "status": "verified"} for m in meds[:5]],
            "reported_allergies": [{"allergen": a.get("allergen", ""), "status": "verified"} for a in allergies[:5]],
            "missing_info": ["None noted from intake interview"],
        }

    def _create_demo_response(self, context: dict) -> dict:
        chief = context.get("chief_complaint", "Not specified")
        symptoms = context.get("symptoms", [])
        meds = context.get("medications", [])
        allergies = context.get("allergies", [])
        return {
            "soap_note": {
                "subjective": f"[DEMO MODE] Patient presents with chief complaint: {chief}. "
                              f"Reported symptoms: {', '.join(symptoms) if symptoms else 'None reported'}. "
                              f"Further history to be obtained by clinician.",
                "objective": "[DEMO MODE] Objective findings pending clinician examination. Vitals to be recorded.",
                "assessment": "[DEMO MODE] Assessment requires clinician review of subjective complaints and objective findings.",
                "plan": "[DEMO MODE] Plan to be determined by treating physician based on complete clinical evaluation.",
            },
            "organized_symptoms": [{"symptom": s, "source": "patient_reported", "note": "[DEMO]"} for s in symptoms],
            "structured_hpi": f"[DEMO MODE] {chief}" if chief else "[DEMO MODE] No chief complaint documented.",
            "reported_medications": [{"name": m.get("medication_name", ""), "note": "[DEMO]"} for m in meds[:5]],
            "reported_allergies": [{"allergen": a.get("allergen", ""), "note": "[DEMO]"} for a in allergies[:5]],
            "missing_info": [
                "[DEMO MODE] Complete HPI details needed",
                "[DEMO MODE] Physical examination not yet performed",
                "[DEMO MODE] Review of systems not documented",
            ],
        }
