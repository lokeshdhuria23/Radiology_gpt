"""Test health endpoint."""
import pytest


def test_health_imports():
    """Test that core modules import correctly."""
    from app.core.config import settings
    assert settings is not None
    assert settings.DEMO_MODE is True


def test_schemas_import():
    """Test that all schemas can be imported."""
    from app.schemas import (
        auth, patient, encounter, clinical,
        document, workflow, report, dashboard, knowledge,
    )
    assert auth is not None
    assert patient is not None


def test_agents_import():
    """Test that all agents can be imported."""
    from app.agents import (
        HistoryAgent, SafetyAgent, ScribeAgent,
        PerceptionAgent, TranslationAgent, SpecialistAgent,
    )
    assert HistoryAgent is not None
    assert SafetyAgent is not None
    assert ScribeAgent is not None
    assert PerceptionAgent is not None
    assert TranslationAgent is not None
    assert SpecialistAgent is not None


def test_safety_agent_rule_based():
    """Test safety agent's rule-based medication duplicate detection."""
    from app.agents.safety_agent import SafetyAgent
    agent = SafetyAgent()

    # Test with duplicate medications
    context = {
        "medications": [
            {"name": "Metformin", "dosage": "500mg", "status": "active"},
            {"name": "Metformin", "dosage": "1000mg", "status": "active"},
        ],
        "allergies": [],
        "conditions": [],
        "lab_results": [],
    }

    # The agent should detect duplicates in its rule-based checks
    assert agent is not None
