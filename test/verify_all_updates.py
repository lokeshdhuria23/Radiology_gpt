import os, sys
sys.path.insert(0, r"c:\Users\lokes\OneDrive\Desktop\coding\Radiology_gpt\backend")
os.environ["HF_HUB_OFFLINE"] = "1"

import asyncio
from datetime import datetime, timezone
from app.database import fallback_store
from app.api.routes.patients import get_patient_longitudinal_summary
from app.api.routes.patient_assistant import patient_assistant_chat, PatientChatMessage

async def main():
    print("=== Testing Longitudinal Summary with Scans & Med Deduplication ===")
    p_id = "72976e9a-5202-4c20-a6c6-9e1e9098364d"
    
    # 1. Add sample scan report to fallback store
    fallback_store.add_report({
        "id": "rep-test-scan-1",
        "patient_id": p_id,
        "title": "Radiology Scan: attend_blip_decoder_freeze.jpg",
        "report_content": "Diagnostic scan **attend_blip_decoder_freeze.jpg** analyzed via RadiologyGPT Multimodal Vision & Perception pipeline.",
        "structured_report": {
            "title": "Radiology Scan: attend_blip_decoder_freeze.jpg",
            "findings": [
                "Bilateral lung fields clear. No acute focal airspace consolidation.",
                "Cardiothoracic ratio within normal physiologic limits (0.46 < 0.50)."
            ],
            "impression": "No acute cardiopulmonary disease.",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    })

    # 2. Add duplicate medications on same day (one older, one updated)
    fallback_store.add_medication({
        "id": "med-1",
        "patient_id": p_id,
        "medication_name": "Ceftriaxone",
        "dosage": "1 g IV daily",
        "frequency": "Once daily",
        "route": "Intravenous (IV)",
        "created_at": "2026-11-25T01:00:00Z",
    })
    fallback_store.add_medication({
        "id": "med-2",
        "patient_id": p_id,
        "medication_name": "Ceftriaxone",
        "dosage": "2 g IV daily",
        "frequency": "Once daily IV infusion",
        "route": "Intravenous (IV)",
        "created_at": "2026-11-25T02:00:00Z",
    })

    # Run get_patient_longitudinal_summary
    class DummyDB:
        async def execute(self, *args, **kwargs):
            raise Exception("Use fallback store")

    summary_res = await get_patient_longitudinal_summary(patient_id=p_id, db=DummyDB())
    print(f"Total days: {summary_res['total_days']}")
    for d_idx, d in enumerate(summary_res["days"]):
        print(f"Day {d_idx}: Date={d['display_date']}, Scans={len(d['scans_reviewed'])}, Meds={len(d['prescriptions_issued'])}")

    first_day = summary_res["days"][0]
    print(f"Date: {first_day['display_date']}")
    target_scan_day = next((d for d in summary_res["days"] if len(d["scans_reviewed"]) > 0), None)
    assert target_scan_day is not None, "Expected at least 1 day with scans reviewed!"
    print(f"Scans Reviewed count on {target_scan_day['display_date']}: {len(target_scan_day['scans_reviewed'])}")
    for s in target_scan_day['scans_reviewed']:
        print(f"  - Scan: {s.get('filename')} | Status: {s.get('status')}")
        print(f"    Findings: {s.get('finding')}")
    
    print(f"\nPrescriptions issued count: {len(first_day['prescriptions_issued'])}")
    for m in first_day['prescriptions_issued']:
        print(f"  - Med: {m.get('name')} | Dose: {m.get('dosage')} | Freq: {m.get('frequency')}")

    # Verify no duplicate Ceftriaxone
    ceftriaxone_count = sum(1 for m in first_day['prescriptions_issued'] if "ceftriaxone" in (m.get('name') or '').lower())
    assert ceftriaxone_count == 1, f"Expected 1 Ceftriaxone, got {ceftriaxone_count}"
    print("Medication deduplication check: PASSED!")

    # Verify scans reviewed is > 0
    assert len(target_scan_day['scans_reviewed']) >= 1, "Expected at least 1 scan reviewed!"
    print("Scans evaluated check: PASSED!")

    # 3. Test Patient Assistant Chat (Knowledge Base Grounded)
    print("\n=== Testing Patient Assistant Chat with Knowledge Base ===")
    chat_req = PatientChatMessage(
        message="What is the normal blood pressure range and what should I do if my CBC shows high WBC?",
        patient_name="Arya Stark",
        allergies=["Penicillin", "Aspirin"],
    )
    chat_res = await patient_assistant_chat(chat_req)
    print("Reply preview:")
    print(chat_res["reply"][:300] + "...")
    assert "blood pressure" in chat_res["reply"].lower() or "wbc" in chat_res["reply"].lower() or "white blood cell" in chat_res["reply"].lower()
    assert "****" not in chat_res["reply"], "Found raw **** in chat response!"
    print("Patient Assistant check: PASSED!")

if __name__ == "__main__":
    asyncio.run(main())
