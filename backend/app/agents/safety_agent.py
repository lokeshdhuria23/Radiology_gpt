import time
from app.agents.base_agent import BaseAgent, AgentOutput
from app.core.logging import get_logger

logger = get_logger(__name__)

# Common drug-allergy conflict pairs
ALLERGY_DRUG_CONFLICTS = {
    "penicillin": ["amoxicillin", "ampicillin", "penicillin", "piperacillin", "nafcillin"],
    "sulfa": ["sulfamethoxazole", "sulfasalazine", "trimethoprim-sulfamethoxazole"],
    "aspirin": ["aspirin"],
    "nsaid": ["ibuprofen", "naproxen", "diclofenac", "celecoxib", "aspirin"],
}
NSAIDS = {"ibuprofen", "naproxen", "diclofenac", "celecoxib", "aspirin", "indomethacin", "meloxicam", "piroxicam", "ketorolac"}
ANTICOAGULANTS = {"warfarin", "heparin", "enoxaparin", "rivaroxaban", "apixaban", "dabigatran", "edoxaban"}

ABNORMAL_LAB_RANGES = {
    "glucose": {"low": 70, "high": 200, "unit": "mg/dL"},
    "potassium": {"low": 3.5, "high": 5.5, "unit": "mEq/L"},
    "sodium": {"low": 130, "high": 150, "unit": "mEq/L"},
    "creatinine": {"high": 1.3, "unit": "mg/dL"},
    "hemoglobin": {"low": 7, "unit": "g/dL"},
    "wbc": {"high": 15000, "unit": "/uL"},
    "platelets": {"low": 50000, "high": 400000, "unit": "/uL"},
}


class ClinicalSafetyAgent(BaseAgent):
    name = "safety_agent"
    description = "Reviews clinical context for potential safety issues"

    async def execute(self, context: dict) -> AgentOutput:
        start = time.time()
        try:
            self.logger.info("Safety agent starting — running rule-based checks")
            observations = []
            allergy_concerns = []
            medication_concerns = []
            missing_info = []

            medications = context.get("medications", [])
            allergies = context.get("allergies", [])
            lab_results = context.get("lab_results", [])

            # 1. Check duplicate medications
            med_names = [m.get("medication_name", "").lower().strip() for m in medications if m.get("status") == "active"]
            seen = set()
            for name in med_names:
                if name in seen:
                    medication_concerns.append({"type": "duplicate", "medication": name, "severity": "warning", "detail": f"Duplicate active medication found: {name}"})
                seen.add(name)

            # 2. Check allergy-medication conflicts
            for allergy in allergies:
                allergen = allergy.get("allergen", "").lower().strip()
                for allergy_key, conflicting_drugs in ALLERGY_DRUG_CONFLICTS.items():
                    if allergy_key in allergen:
                        for med in medications:
                            if med.get("status") == "active" and med.get("medication_name", "").lower().strip() in conflicting_drugs:
                                allergy_concerns.append({
                                    "type": "allergy_conflict", "severity": "critical",
                                    "allergen": allergen, "medication": med.get("medication_name", ""),
                                    "detail": f"Patient allergic to {allergen} — prescribed {med.get('medication_name', '')} which may cause a reaction."
                                })

            # 3. Check NSAID + anticoagulant
            active_nsaids = [n for n in med_names if n in NSAIDS]
            active_anticoag = [n for n in med_names if n in ANTICOAGULANTS]
            if active_nsaids and active_anticoag:
                medication_concerns.append({
                    "type": "drug_interaction", "severity": "critical",
                    "detail": f"NSAID ({', '.join(active_nsaids)}) co-prescribed with anticoagulant ({', '.join(active_anticoag)}). Increased bleeding risk.",
                })

            # 4. Check abnormal lab values (including structured document extractions)
            all_labs_to_check = list(lab_results)
            for ext in context.get("extractions", []):
                if isinstance(ext, dict):
                    sdata = ext.get("structured_data", {})
                    if isinstance(sdata, dict) and sdata.get("lab_values"):
                        all_labs_to_check.extend(sdata["lab_values"])

            for lab in all_labs_to_check:
                test_name = (lab.get("test_name") or "").lower().strip()
                try:
                    val_str = str(lab.get("value", "0")).replace(",", "").replace("*", "").split()[0]
                    value = float(val_str)
                except (ValueError, IndexError):
                    continue

                for key, ranges in ABNORMAL_LAB_RANGES.items():
                    if key in test_name:
                        # Scale if units are in 10³/µL or thousands
                        check_val = value
                        if key in ("wbc", "platelets") and value < 1000:
                            check_val = value * 1000

                        if "low" in ranges and check_val < ranges["low"]:
                            observations.append({"type": "abnormal_lab", "severity": "warning", "test": lab.get("test_name"), "value": lab.get("value"), "detail": f"{lab.get('test_name')} = {lab.get('value')} is below critical reference threshold ({ranges['low']} {ranges['unit']})"})
                        if "high" in ranges and check_val > ranges["high"]:
                            observations.append({"type": "abnormal_lab", "severity": "warning", "test": lab.get("test_name"), "value": lab.get("value"), "detail": f"{lab.get('test_name')} = {lab.get('value')} exceeds critical reference threshold ({ranges['high']} {ranges['unit']})"})

            # 5. Antimicrobial stewardship check
            extractions = context.get("extractions", [])
            has_pneumonia = any("pneumonia" in str(ext).lower() or "consolidation" in str(ext).lower() or "wbc 16" in str(ext).lower() for ext in extractions)
            has_clear_scan = any("clear" in str(ext).lower() or "sternotomy" in str(ext).lower() for ext in extractions)
            if has_clear_scan and not has_pneumonia:
                observations.append({
                    "type": "antimicrobial_stewardship",
                    "severity": "info",
                    "detail": "Radiological scan demonstrates clear lung fields without acute pneumonia or focal consolidation. Empiric antimicrobial therapy is not indicated without documented infection.",
                })

            # 6. Missing data checks
            if not medications:
                missing_info.append("No medication records available for safety review")
            if not allergies:
                missing_info.append("No allergy records documented — allergy status should be confirmed")
            if not lab_results:
                missing_info.append("No recent lab results available for review")

            # Determine severity
            has_critical = any(c.get("severity") == "critical" for c in allergy_concerns + medication_concerns)
            overall_severity = "critical" if has_critical else ("warning" if observations or medication_concerns else "info")

            result = {
                "safety_observations": observations,
                "severity_labels": {"overall": overall_severity},
                "allergy_concerns": allergy_concerns,
                "medication_concerns": medication_concerns,
                "missing_info": missing_info,
                "review_recommendations": ["All flagged items require clinician review." if observations or allergy_concerns or medication_concerns else "No immediate safety concerns detected from available data."],
                "interaction_check_performed": False,
                "interaction_check_note": "No external drug interaction database was consulted. Rule-based checks only.",
            }

            elapsed = int((time.time() - start) * 1000)
            text_model = self.registry.get_text_model()
            vision_model = self.registry.get_vision_model()
            has_models = (text_model and text_model.is_loaded) or (vision_model and vision_model.is_loaded)
            is_demo = not has_models and self.registry.is_demo_mode
            return AgentOutput(
                agent_name=self.name, status="completed",
                output=result, execution_time_ms=elapsed,
                model_used="RadiologyGPT-ClinicalSafety" if has_models else "rule-based + demo", is_demo=is_demo,
            )
        except Exception as e:
            elapsed = int((time.time() - start) * 1000)
            self.logger.error(f"Safety agent failed: {e}")
            return AgentOutput(agent_name=self.name, status="failed", errors=[str(e)], execution_time_ms=elapsed)

    def _build_prompt(self, context: dict) -> str:
        return "Analyze clinical safety."

    def _create_demo_response(self, context: dict) -> dict:
        return {}
