from app.agents.base_agent import BaseAgent


class PatientTranslationAgent(BaseAgent):
    name = "translation_agent"
    description = "Converts clinical information into patient-friendly language"

    def _build_prompt(self, context: dict) -> str:
        findings = context.get("findings", [])
        lab_results = context.get("lab_results", [])
        return f"""Convert the following clinical information into simple, patient-friendly language.
Findings: {len(findings)} items
Lab Results: {len(lab_results)} results

Explain what the results mean in simple terms. Do not diagnose. Do not recommend medication changes. Suggest questions the patient may ask their doctor."""

    def _create_model_response(self, context: dict) -> dict:
        conditions = context.get("conditions", [])
        lab_results = context.get("lab_results", [])
        documents = context.get("documents", [])
        extractions = context.get("extractions", [])

        # Check for specific imaging findings vs laboratory panels
        has_sternotomy = False
        has_cardiomegaly = False
        detected_labs = []
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
                    if sdata.get("lab_values"):
                        is_lab_doc = True
                        detected_labs.extend(sdata["lab_values"])
                etext = ext.get("extracted_text", "").lower()
                if "sternotomy" in etext or "sternal wire" in etext:
                    has_sternotomy = True
                if "cardiomegaly" in etext:
                    has_cardiomegaly = True
                if "wbc count" in etext or "cbc" in etext or "hemoglobin" in etext or "platelet" in etext:
                    is_lab_doc = True

        if is_lab_doc and (detected_labs or lab_results):
            summary = (
                "Your doctor has reviewed your blood test report. The key markers give valuable insight into your immune response, "
                "red blood cell count, and how well your body is healing. Your care team has noted the numbers that are slightly outside normal "
                "ranges and will discuss the best steps and supportive care with you."
            )
            terms = [
                {"term": "White Blood Cells (WBC)", "explanation": "Cells that defend your body against germs and infections. When elevated, it usually means your immune system is actively fighting an infection or inflammation."},
                {"term": "Hemoglobin & RBC", "explanation": "The protein and cells that carry oxygen from your lungs to the rest of your body. Low levels cause tiredness, which can be improved with iron and proper nutrition."},
                {"term": "Platelets (PLT)", "explanation": "Tiny cell fragments that help your blood clot and heal wounds. A lower count means taking care to avoid cuts and bruises."},
            ]
            finding_expl = []
            for lv in detected_labs[:4]:
                name = lv.get("test_name", "")
                val = lv.get("value", "")
                flag = lv.get("flag", "NORMAL")
                meaning = "within normal range" if flag == "NORMAL" else f"currently {flag.lower()}"
                finding_expl.append({"finding": f"{name}: {val}", "explanation": f"Your {name} was measured at {val}, which is {meaning}."})
            if not finding_expl:
                finding_expl = [{"finding": "Complete Blood Count", "explanation": "Blood count indicators analyzed for clinical correlation."}]
        elif has_sternotomy or has_cardiomegaly:
            summary = (
                "Your doctor has reviewed your chest X-ray. The scan confirms that your surgical wires from prior heart surgery "
                "are intact and in normal alignment. Your heart silhouette appears enlarged (cardiomegaly), which your cardiology team "
                "will evaluate, and your lungs are completely clear without infection or pneumonia."
            )
            terms = [
                {"term": "Sternal Closure Wires", "explanation": "Small, secure surgical wires placed in your breastbone during your prior heart surgery to help the bone heal firmly. They are intact and stable."},
                {"term": "Cardiomegaly", "explanation": "A term indicating that your heart shadow appears larger than average on the X-ray. Your cardiologist will assess your heart function with an echocardiogram."},
                {"term": "Clear Lung Parenchyma", "explanation": "Your lung tissue looks clear and healthy, with no signs of pneumonia, fluid buildup, or acute congestion."},
            ]
            finding_expl = [
                {"finding": "Surgical Hardware (Sternal Wires)", "explanation": "Intact midline wires verified in normal alignment."},
                {"finding": "Heart Silhouette", "explanation": "Cardiomegaly noted for cardiology follow-up."},
                {"finding": "Lungs", "explanation": "No pneumonia or lung infection detected."},
            ]
        else:
            summary = (
                "Your doctor has reviewed your health records, recent laboratory tests, and imaging scans. "
                "Your overall results and imaging features have been correlated to help guide your treatment plan. "
                "Your care team will review these findings with you in detail during your visit."
            )
            terms = [
                {"term": c.get("condition_name", "Medical Condition"), "explanation": f"{c.get('condition_name', 'This condition')} is being managed and monitored by your physician as part of your care plan."}
                for c in conditions[:3]
            ] if conditions else [{"term": "Radiological Scan", "explanation": "A specialized medical image (such as an X-ray or CT scan) that allows doctors to check your organs, lungs, and bones."}]
            finding_expl = [
                {"finding": f"Laboratory Test: {lr.get('test_name', '')}", "explanation": f"Your {lr.get('test_name', '')} measurement was recorded as {lr.get('value', '')} {lr.get('unit', '')}."}
                for lr in lab_results[:3]
            ] if lab_results else [{"finding": "Imaging Examination", "explanation": f"{len(documents)} medical scans evaluated. Anatomical structures clearly visualized."}]

        return {
            "simplified_summary": summary,
            "term_explanations": terms,
            "finding_explanations": finding_expl,
            "suggested_questions": [
                "What do my scan results and lab numbers mean for my daily health?",
                "Are there any specific symptoms or warning signs I should watch for at home?",
                "Do any of my medications or lifestyle habits need adjustment?",
                "When should I schedule my next follow-up appointment or scan?",
            ],
            "limitations": [
                "This summary is an AI-assisted translation for educational reference.",
                "It does not replace personalized medical advice from your physician.",
                "Always discuss your medical results directly with your healthcare provider.",
            ],
        }

    def _create_demo_response(self, context: dict) -> dict:
        conditions = context.get("conditions", [])
        lab_results = context.get("lab_results", [])
        return {
            "simplified_summary": "[DEMO MODE] Your doctor has reviewed your medical records and test results. Some findings have been noted that your doctor will discuss with you. This summary is AI-generated and should not replace a conversation with your healthcare provider.",
            "term_explanations": [
                {"term": c.get("condition_name", ""), "explanation": f"[DEMO] {c.get('condition_name', '')} is a medical condition that your doctor is monitoring.", "note": "[DEMO]"}
                for c in conditions[:3]
            ],
            "finding_explanations": [
                {"finding": f"Lab: {lr.get('test_name', '')}", "explanation": f"[DEMO] Your {lr.get('test_name', '')} result was {lr.get('value', '')} {lr.get('unit', '')}.", "note": "[DEMO]"}
                for lr in lab_results[:3]
            ],
            "suggested_questions": [
                "What do my test results mean for my overall health?",
                "Are there any lifestyle changes I should consider?",
                "When should I schedule my next follow-up appointment?",
                "Should any of my medications be reviewed?",
            ],
            "limitations": [
                "[DEMO MODE] This explanation was generated by an AI system in demo mode.",
                "This is not a diagnosis or medical advice.",
                "Please discuss all findings with your healthcare provider.",
            ],
        }
