import asyncio
from app.api.routes.auth import login, register, REGISTERED_USERS
from app.schemas.auth import LoginRequest, RegisterRequest
from app.database import fallback_store
from app.database.session import AsyncSessionLocal

async def test_full_flow():
    print("=== Testing Clean Slate & Authentication ===")

    # 1. Clean slate verification
    fallback_store.clear_all_patient_data()
    initial_patients = fallback_store.list_patients()
    print(f"1. Initial patients in roster: {initial_patients['total']}")
    assert initial_patients['total'] == 0, "Patient roster should be clean slate (0 patients)"

    async with AsyncSessionLocal() as session:
        # 2. Test Doctor Login
        doc_login = await login(LoginRequest(email="doctor@demo.com", password="password"), session)
        print(f"2. Doctor login: {doc_login.user.full_name} ({doc_login.user.role})")
        assert doc_login.user.role == "doctor"

        # 3. Patient Registration via Patient Portal
        pat_reg = await register(
            RegisterRequest(
                email="kavya.verma@example.com",
                password="password123",
                full_name="Kavya Verma",
                role="patient",
                phone="9876543210",
                date_of_birth="2001-08-15",
                sex="female",
                consultation_type="Neurology"
            ),
            session
        )
        print(f"3. Patient registered: {pat_reg.user.full_name}, MRN={pat_reg.user.patient_identifier}, role={pat_reg.user.role}")
        assert pat_reg.user.role == "patient"
        assert pat_reg.user.patient_identifier is not None
        assigned_mrn = pat_reg.user.patient_identifier

        # 4. Registered Patient automatically appears on Doctor Portal roster
        roster = fallback_store.list_patients()
        print(f"4. Doctor roster count after patient registration: {roster['total']}")
        assert roster['total'] == 1
        assert roster['items'][0].full_name == "Kavya Verma"
        assert roster['items'][0].patient_identifier == assigned_mrn
        print(f"   Roster patient verified: {roster['items'][0].full_name} ({roster['items'][0].patient_identifier}) - Specialty: {roster['items'][0].specialty}")

        # 5. Patient Authentication by MRN
        mrn_login = await login(LoginRequest(email=assigned_mrn, password="password123"), session)
        print(f"5. Patient login by MRN ({assigned_mrn}): {mrn_login.user.full_name} ({mrn_login.user.role})")
        assert mrn_login.user.role == "patient"
        assert mrn_login.user.full_name == "Kavya Verma"

        # 6. Patient Authentication by Full Name
        name_login = await login(LoginRequest(email="Kavya Verma", password="password123"), session)
        print(f"6. Patient login by Name (Kavya Verma): {name_login.user.full_name} ({name_login.user.role})")
        assert name_login.user.role == "patient"
        assert name_login.user.full_name == "Kavya Verma"

        # 7. Patient Authentication by Email
        email_login = await login(LoginRequest(email="kavya.verma@example.com", password="password123"), session)
        print(f"7. Patient login by Email: {email_login.user.full_name} ({email_login.user.role})")
        assert email_login.user.role == "patient"
        assert email_login.user.full_name == "Kavya Verma"

    print("\n>>> ALL TESTS PASSED SUCCESSFULLY! Clean slate, self-registration, doctor roster syncing, and authentication verified. <<<")

if __name__ == "__main__":
    asyncio.run(test_full_flow())
