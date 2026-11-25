"""Shared test fixtures."""
import pytest
import os

os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-key")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("DEMO_MODE", "true")


@pytest.fixture
def demo_patient():
    return {
        "medical_record_number": "MRN-TEST-001",
        "first_name": "Test",
        "last_name": "Patient",
        "date_of_birth": "1990-01-15",
        "gender": "male",
    }


@pytest.fixture
def demo_encounter():
    return {
        "encounter_type": "outpatient",
        "chief_complaint": "Routine checkup",
    }
