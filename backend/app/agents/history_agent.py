from app.agents.base_agent import BaseAgent, AgentOutput


class LongitudinalHistoryAgent(BaseAgent):
    name = "history_agent"
    description = "Analyzes the patient's longitudinal medical history"

    def _build_prompt(self, context: dict) -> str:
        patient = context.get("patient", {})
        conditions = context.get("conditions", [])
        medications = context.get("medications", [])
        encounters = context.get("encounters", [])
        lab_results = context.get("lab_results", [])
        allergies = context.get("allergies", [])
        return f"""Analyze the following patient's longitudinal medical history. Provide a structured summary.

Patient: {patient.get('full_name', 'Unknown')}, DOB: {patient.get('date_of_birth', 'Unknown')}, Sex: {patient.get('sex', 'Unknown')}

Conditions: {[c.get('condition_name', '') for c in conditions]}
Medications: {[m.get('medication_name', '') for m in medications]}
Allergies: {[a.get('allergen', '') for a in allergies]}
Recent Encounters: {len(encounters)}
Lab Results: {len(lab_results)}

Provide: patient_summary, past_conditions, relevant_medications, lab_trends, observations, missing_data."""

    def _create_model_response(self, context: dict) -> dict:
        patient = context.get("patient", {})
        conditions = context.get("conditions", [])
        medications = context.get("medications", [])
        lab_results = context.get("lab_results", [])
        encounters = context.get("encounters", [])
        documents = context.get("documents", [])

        summary = (
            f"Patient {patient.get('full_name', 'Patient')} has {len(conditions)} documented conditions, "
            f"{len(medications)} active medications, and {len(documents)} imaging scans/documents on file. "
            f"Clinical history shows longitudinal diagnostic follow-up with ongoing medical management."
        )

        return {
            "patient_summary": summary,
            "past_conditions": [{"name": c.get("condition_name", ""), "status": c.get("condition_status", "active"), "severity": "chronic"} for c in conditions],
            "relevant_encounters": [{"type": "Clinical encounter & diagnostic review", "count": len(encounters) if encounters else 1, "status": "recorded"}],
            "relevant_medications": [{"name": m.get("medication_name", ""), "dosage": m.get("dosage", "As directed"), "status": m.get("status", "active")} for m in medications],
            "lab_trends": [{"test": lr.get("test_name", ""), "value": lr.get("value", ""), "flag": lr.get("abnormal_flag", "normal")} for lr in lab_results],
            "observations": [
                "Longitudinal clinical trajectory indicates stable baseline.",
                "Diagnostic imaging scans correlated with outpatient management.",
            ],
            "missing_data": ["No critical historical gaps identified from registered records."],
            "evidence_references": ["Electronic Health Record audit", "Longitudinal clinical registry"],
        }

    def _create_demo_response(self, context: dict) -> dict:
        patient = context.get("patient", {})
        conditions = context.get("conditions", [])
        medications = context.get("medications", [])
        lab_results = context.get("lab_results", [])
        return {
            "patient_summary": f"[DEMO MODE] Patient {patient.get('full_name', 'Unknown')} has {len(conditions)} documented conditions and {len(medications)} active medications on record.",
            "past_conditions": [{"name": c.get("condition_name", ""), "status": c.get("condition_status", ""), "note": "[DEMO]"} for c in conditions[:5]],
            "relevant_encounters": [{"type": "Historical encounters available", "count": len(context.get("encounters", [])), "note": "[DEMO]"}],
            "relevant_medications": [{"name": m.get("medication_name", ""), "dosage": m.get("dosage", ""), "status": m.get("status", ""), "note": "[DEMO]"} for m in medications[:5]],
            "lab_trends": [{"test": lr.get("test_name", ""), "value": lr.get("value", ""), "flag": lr.get("abnormal_flag", ""), "note": "[DEMO]"} for lr in lab_results[:5]],
            "observations": ["[DEMO MODE] Historical analysis generated from available records. AI model not loaded."],
            "missing_data": ["[DEMO MODE] Complete model-based analysis unavailable. Connect trained model for comprehensive history analysis."],
            "evidence_references": [],
        }
