import asyncio
import uuid
from app.api.routes.auth import login, register, REGISTERED_USERS
from app.schemas.auth import LoginRequest, RegisterRequest
from app.database import fallback_store
from app.database.session import AsyncSessionLocal

async def test_auth():
    print("Testing auth flows...")

    # Ensure fallback store has a sample patient for testing
    p1 = fallback_store.add_patient({
        "id": "f2e75b7f-9318-4112-8ba2-ff9b0e58fb8f",
        "patient_identifier": "MRN-408525",
        "full_name": "amit kumar",
        "specialty": "Neurology",
        "phone": "9848563343",
        "contact_info": {"phone": "9848563343", "email": "amit@patient.local"}
    })
    print(f"Added patient: {p1.full_name} ({p1.patient_identifier})")

    async with AsyncSessionLocal() as session:
        # 1. Test login by MRN
        res_mrn = await login(LoginRequest(email="MRN-408525", password="password"), session)
        print(f"Login by MRN (MRN-408525): role={res_mrn.user.role}, name={res_mrn.user.full_name}, patient_id={res_mrn.user.patient_id}")
        assert res_mrn.user.role == "patient"
        assert res_mrn.user.full_name == "amit kumar"

        # 2. Test login by Name
        res_name = await login(LoginRequest(email="amit kumar", password="password"), session)
        print(f"Login by Name (amit kumar): role={res_name.user.role}, name={res_name.user.full_name}, patient_id={res_name.user.patient_id}")
        assert res_name.user.role == "patient"
        assert res_name.user.full_name == "amit kumar"

        # 3. Test login by standard patient demo
        res_pat = await login(LoginRequest(email="patient@demo.com", password="password"), session)
        print(f"Login by patient@demo.com: role={res_pat.user.role}, name={res_pat.user.full_name}")
        assert res_pat.user.role == "patient"

        # 4. Test login by Doctor
        res_doc = await login(LoginRequest(email="doctor@demo.com", password="password"), session)
        print(f"Login by doctor@demo.com: role={res_doc.user.role}, name={res_doc.user.full_name}")
        assert res_doc.user.role == "doctor"

        # 5. Test registration for a new Patient
        new_pat_req = RegisterRequest(
            email="rohit.sharma@example.com",
            password="password123",
            full_name="Rohit Sharma",
            role="patient",
            phone="9876543210",
            date_of_birth="1992-04-30",
            sex="male",
            consultation_type="Cardiology"
        )
        res_reg = await register(new_pat_req, session)
        print(f"Register new patient: role={res_reg.user.role}, name={res_reg.user.full_name}, mrn={res_reg.user.patient_identifier}, pat_id={res_reg.user.patient_id}")
        assert res_reg.user.role == "patient"
        assert res_reg.user.full_name == "Rohit Sharma"
        assert res_reg.user.patient_identifier is not None

        # 6. Test login with newly registered patient
        res_new_login = await login(LoginRequest(email="rohit.sharma@example.com", password="password123"), session)
        print(f"Login newly registered patient: role={res_new_login.user.role}, name={res_new_login.user.full_name}")
        assert res_new_login.user.role == "patient"

        # 7. Test login newly registered patient by their MRN!
        res_mrn_login = await login(LoginRequest(email=res_reg.user.patient_identifier, password="password123"), session)
        print(f"Login newly registered patient by MRN: role={res_mrn_login.user.role}, name={res_mrn_login.user.full_name}")
        assert res_mrn_login.user.role == "patient"
        assert res_mrn_login.user.full_name == "Rohit Sharma"

    print("ALL AUTH TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(test_auth())
