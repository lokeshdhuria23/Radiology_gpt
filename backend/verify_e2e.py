import asyncio
import uuid
import sys
import io
import httpx
from app.main import app

async def test_all_new_features():
    print("=== STARTING FULL SUITE VERIFICATION ===")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test", timeout=45.0) as client:
        
        # 1. Health check
        print("\n1. Health check...")
        r = await client.get("/api/health")
        assert r.status_code == 200
        print("  -> OK:", r.json()["status"])

        # 2. Doctor Login
        print("\n2. Doctor Login...")
        r = await client.post("/api/auth/login", json={"email": "doctor@demo.com", "password": "password"})
        assert r.status_code == 200
        doc_token = r.json()["access_token"]
        doc_headers = {"Authorization": f"Bearer {doc_token}"}
        print("  -> Logged in as doctor")

        # 3. Patient Registration with Consultation Type
        print("\n3. Patient Registration with Consultation Type (Radiology)...")
        unique_email = f"pat_rad_{uuid.uuid4().hex[:6]}@example.com"
        r = await client.post("/api/auth/register", json={
            "email": unique_email,
            "password": "Password123!",
            "full_name": "Eleanor Vance",
            "role": "patient",
            "date_of_birth": "1978-04-12",
            "sex": "female",
            "phone": "+1-555-0188",
            "consultation_type": "Radiology",
        })
        assert r.status_code == 200, f"Registration failed: {r.text}"
        pat_token = r.json()["access_token"]
        pat_headers = {"Authorization": f"Bearer {pat_token}"}
        print("  -> Patient registered successfully")

        # 4. Doctor creates a patient with specific consultation specialty
        print("\n4. Creating patient under Radiology department...")
        mrn = f"MRN-{uuid.uuid4().hex[:6].upper()}"
        r = await client.post("/api/patients/", json={
            "medical_record_number": mrn,
            "first_name": "Arthur",
            "last_name": "Pendelton",
            "date_of_birth": "1955-11-20",
            "gender": "male",
            "blood_type": "A+",
            "specialty": "Radiology",
            "consultation_type": "Radiology",
        }, headers=doc_headers)
        assert r.status_code == 201, f"Create patient failed: {r.text}"
        patient = r.json()
        patient_id = patient["id"]
        print(f"  -> Created patient {patient_id} (Specialty: {patient.get('specialty')})")

        # 5. Doctor lists patients with specialty filter
        print("\n5. Testing doctor specialty filtering (Radiology vs Cardiology)...")
        r_rad = await client.get("/api/patients/?specialty=Radiology", headers=doc_headers)
        assert r_rad.status_code == 200
        rad_items = r_rad.json()["items"]
        assert any(str(p["id"]) == str(patient_id) for p in rad_items), "Patient should appear under Radiology filter"
        print(f"  -> Radiology filter matched {len(rad_items)} patients")

        r_cardio = await client.get("/api/patients/?specialty=Cardiology", headers=doc_headers)
        assert r_cardio.status_code == 200
        cardio_items = r_cardio.json()["items"]
        assert not any(str(p["id"]) == str(patient_id) for p in cardio_items), "Radiology patient must not show under Cardiology filter"
        print("  -> Specialty separation verified: Radiology patient correctly excluded from Cardiology")

        # 6. Upload an image scan (Chest X-ray simulation)
        print("\n6. Uploading image scan for patient...")
        # A minimal 100x100 PNG image
        from PIL import Image
        buf = io.BytesIO()
        img = Image.new("RGB", (300, 300), color=(30, 30, 30))
        img.save(buf, format="PNG")
        image_bytes = buf.getvalue()

        files = {"file": ("chest_xray_scan.png", image_bytes, "image/png")}
        r = await client.post(f"/api/documents/upload/{patient_id}", files=files, headers=doc_headers)
        assert r.status_code == 201, f"Upload failed: {r.text}"
        doc_id = r.json()["id"]
        print(f"  -> Uploaded image document: {doc_id}")

        # 7. AI Document & OCR Extraction
        print("\n7. AI Document & Scan Extraction...")
        r = await client.post(f"/api/documents/{doc_id}/extract", headers=doc_headers)
        assert r.status_code == 200, f"Extraction failed: {r.text}"
        ext_res = r.json()
        assert ext_res.get("extracted_text"), "Must return extracted narrative"
        assert ext_res.get("structured_data"), "Must return structured findings"
        print("  -> Extraction success! Extracted text preview:\n    ", ext_res["extracted_text"][:120], "...")

        # 8. Run Full AI Analysis Workflow
        print("\n8. Triggering full multi-agent clinical decision support workflow...")
        r = await client.post("/api/workflows/start", json={
            "patient_id": patient_id,
            "config": {"specialty": "radiology"}
        }, headers=doc_headers)
        assert r.status_code == 201, f"Workflow start failed: {r.text}"
        wf_res = r.json()
        workflow_id = wf_res.get("id") or wf_res.get("workflow_id")
        assert workflow_id, "Workflow ID must be returned"
        print(f"  -> Workflow completed with ID: {workflow_id}")

        # 9. Verify generated report contains history summary & prescriptions
        print("\n9. Verifying generated clinical report...")
        r = await client.get(f"/api/reports/patient/{patient_id}", headers=doc_headers)
        assert r.status_code == 200
        reports = r.json().get("items", [])
        assert len(reports) > 0, "At least one report should be generated"
        latest_report = reports[0]
        report_id = latest_report["id"]
        struct = latest_report.get("structured_report", {})
        print(f"  -> Report ID: {report_id}")
        print(f"  -> History Summary: {struct.get('patient_history_summary')[:100]}...")
        print(f"  -> Impression: {struct.get('impression')[:80]}...")
        assert struct.get("patient_history_summary"), "Report must include longitudinal history summary"
        assert len(struct.get("prescriptions", [])) > 0, "Report must include AI-recommended prescriptions"

        # 10. Doctor Sends Report & Prescriptions to Patient Dashboard
        print("\n10. Syncing report & prescriptions to patient portal...")
        r = await client.post(f"/api/reports/{report_id}/send-to-patient", json={
            "doctor_notes": "Prescription released. Take with food twice daily for 7 days. Return for follow-up radiograph in 4 weeks.",
            "prescriptions": struct.get("prescriptions", [])
        }, headers=doc_headers)
        assert r.status_code == 200, f"Sync failed: {r.text}"
        print("  -> Successfully synced to patient dashboard")

        # 11. Patient verifies reports & prescriptions in their portal
        print("\n11. Patient accesses reports in their dashboard...")
        r = await client.get(f"/api/reports/patient/{patient_id}", headers=pat_headers)
        assert r.status_code == 200
        patient_reports = r.json().get("items", [])
        assert len(patient_reports) > 0
        p_struct = patient_reports[0].get("structured_report", {})
        assert p_struct.get("sent_to_patient") is True, "Report must be flagged as sent to patient"
        print(f"  -> Patient verified report: {p_struct.get('title')}")
        print(f"  -> Prescribed medications: {[rx['medication_name'] for rx in p_struct.get('prescriptions', [])]}")

        print("\n=== ALL CRITICAL FLOWS AND USER REQUIREMENTS VERIFIED SUCCESSFULLY ===")
        return True

if __name__ == "__main__":
    success = asyncio.run(test_all_new_features())
    sys.exit(0 if success else 1)
