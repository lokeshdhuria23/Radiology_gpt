-- =============================================================================
-- Migration 002: Tables, Indexes, and Constraints
-- Project: Clinical Decision Support System (CDSS) - Radiology GPT
-- Description: Creates 25 relational and vector tables with UUID primary keys,
--              foreign key constraints, comprehensive B-Tree indexes, HNSW
--              vector similarity indexes (384 dims), GIN JSONB indexes, and
--              updated_at trigger functions.
-- =============================================================================

-- Ensure vector extension exists in search_path
SET search_path TO public, extensions;

-- -----------------------------------------------------------------------------
-- 0. Shared Trigger Function for updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 1. app_users
-- Core application user directory linked optionally to auth.users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    username VARCHAR(100),
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'doctor', 'patient', 'staff')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_app_users_auth FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TRIGGER trg_app_users_updated_at
    BEFORE UPDATE ON public.app_users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 2. doctors
-- Clinical staff and physician profiles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    qualifications TEXT,
    contact_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_doctors_updated_at
    BEFORE UPDATE ON public.doctors
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 3. patients
-- Master patient registry
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    patient_identifier VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    sex VARCHAR(20) NOT NULL,
    contact_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    address TEXT,
    emergency_contact JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 4. patient_doctor_assignments
-- Doctor-patient care relationships
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_doctor_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    assignment_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (assignment_status IN ('active', 'inactive', 'transferred', 'completed')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_patient_doctor_assignment UNIQUE (patient_id, doctor_id)
);

-- -----------------------------------------------------------------------------
-- 5. encounters
-- Clinical visits, consultations, and triage encounters
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
    encounter_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    encounter_type VARCHAR(50) NOT NULL,
    chief_complaint TEXT,
    symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
    clinical_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (clinical_status IN ('active', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_encounters_updated_at
    BEFORE UPDATE ON public.encounters
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 6. vitals
-- Physiological measurements per encounter or check-in
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    blood_pressure_systolic INT,
    blood_pressure_diastolic INT,
    heart_rate INT,
    respiratory_rate INT,
    temperature NUMERIC(5,2),
    oxygen_saturation NUMERIC(5,2),
    height NUMERIC(6,2),
    weight NUMERIC(6,2),
    bmi NUMERIC(5,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 7. conditions
-- Diagnosed health conditions and problem list
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    condition_name VARCHAR(255) NOT NULL,
    condition_code VARCHAR(50),
    condition_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (condition_status IN ('active', 'recurrence', 'relapse', 'remission', 'resolved')),
    onset_date DATE,
    resolved_date DATE,
    source VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_conditions_updated_at
    BEFORE UPDATE ON public.conditions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 8. allergies
-- Documented hypersensitivities and adverse reactions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    allergen VARCHAR(255) NOT NULL,
    allergy_type VARCHAR(50),
    severity VARCHAR(50),
    reaction TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resolved')),
    source VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_allergies_updated_at
    BEFORE UPDATE ON public.allergies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 9. medications
-- Active and historical patient medication list
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    medication_code VARCHAR(50),
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    route VARCHAR(50),
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stopped', 'on_hold', 'completed')),
    source VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_medications_updated_at
    BEFORE UPDATE ON public.medications
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 10. medication_orders
-- Prescriptions and medication orders authored during encounters
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medication_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    route VARCHAR(50),
    duration VARCHAR(50),
    instructions TEXT,
    order_status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (order_status IN ('draft', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_medication_orders_updated_at
    BEFORE UPDATE ON public.medication_orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 11. medical_files
-- Imaging (DICOM), PDFs, laboratory sheets, and diagnostic attachments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medical_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
    uploaded_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    mime_type VARCHAR(100),
    file_size BIGINT,
    document_category VARCHAR(50),
    processing_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    upload_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 12. lab_results
-- Discrete laboratory assays, bloodwork, and specimen tests
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
    test_name VARCHAR(255) NOT NULL,
    test_code VARCHAR(50),
    value VARCHAR(100) NOT NULL,
    unit VARCHAR(50),
    reference_range VARCHAR(100),
    abnormal_flag VARCHAR(20),
    specimen VARCHAR(100),
    result_date DATE DEFAULT CURRENT_DATE,
    source_file_id UUID REFERENCES public.medical_files(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_lab_results_updated_at
    BEFORE UPDATE ON public.lab_results
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 13. clinical_notes
-- Physician clinical notes, radiology narratives, and discharge summaries
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    note_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    structured_content JSONB NOT NULL DEFAULT '{}'::jsonb,
    source VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'preliminary', 'final', 'amended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_clinical_notes_updated_at
    BEFORE UPDATE ON public.clinical_notes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 14. ai_workflows
-- High-level orchestration jobs for multi-agent diagnostic analysis
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
    initiated_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    workflow_type VARCHAR(50) NOT NULL DEFAULT 'full',
    workflow_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (workflow_status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    workflow_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_ai_workflows_updated_at
    BEFORE UPDATE ON public.ai_workflows
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 15. agent_runs
-- Individual agent executions (e.g., Vision, Segmentation, Guideline Evaluator)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.ai_workflows(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
    agent_name VARCHAR(100) NOT NULL,
    model_name VARCHAR(100),
    execution_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (execution_status IN ('pending', 'running', 'completed', 'failed')),
    input_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    execution_time_ms INT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 16. document_extractions
-- OCR, text parser, and structured entity extractions from medical files
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medical_file_id UUID NOT NULL REFERENCES public.medical_files(id) ON DELETE CASCADE,
    extraction_type VARCHAR(50),
    extracted_text TEXT,
    structured_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence NUMERIC(5,4),
    extraction_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    agent_run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_document_extractions_updated_at
    BEFORE UPDATE ON public.document_extractions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 17. clinical_findings
-- Discrete findings, radiologic lesions, and risk alerts produced by CDSS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinical_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
    workflow_id UUID REFERENCES public.ai_workflows(id) ON DELETE CASCADE,
    agent_run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
    finding_category VARCHAR(50) NOT NULL,
    finding_title VARCHAR(255) NOT NULL,
    finding_description TEXT,
    severity VARCHAR(50),
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence NUMERIC(5,4),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'confirmed', 'dismissed', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 18. clinical_reports
-- Synthesized diagnostic reports generated by AI workflows
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinical_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
    workflow_id UUID REFERENCES public.ai_workflows(id) ON DELETE SET NULL,
    report_version INT NOT NULL DEFAULT 1,
    report_content TEXT,
    structured_report JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'finalized', 'amended')),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_clinical_reports_updated_at
    BEFORE UPDATE ON public.clinical_reports
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 19. report_reviews
-- Physician oversight, attestation, and validation of AI reports
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.report_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.clinical_reports(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
    review_status VARCHAR(30) NOT NULL CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_revision')),
    comments TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 20. document_chunks
-- Semantic chunks with 384-dimensional pgvector embeddings for RAG over patient files
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
    medical_file_id UUID NOT NULL REFERENCES public.medical_files(id) ON DELETE CASCADE,
    extraction_id UUID REFERENCES public.document_extractions(id) ON DELETE SET NULL,
    chunk_text TEXT NOT NULL,
    chunk_index INT NOT NULL,
    embedding vector(384),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 21. audit_logs
-- Immutable compliance and HIPAA access audit log
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 22. knowledge_sources
-- Knowledge base origin registries (e.g., ACR, Fleischner, PubMed, WHO)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_url TEXT,
    description TEXT,
    license_info TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_knowledge_sources_updated_at
    BEFORE UPDATE ON public.knowledge_sources
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 23. knowledge_documents
-- Clinical guidelines, literature publications, and radiology reference manuals
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_path TEXT,
    file_type VARCHAR(50),
    category VARCHAR(100),
    subcategory VARCHAR(100),
    specialty_tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    agent_tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    ingestion_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (ingestion_status IN ('pending', 'ingesting', 'completed', 'failed')),
    error_message TEXT,
    chunk_count INT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_knowledge_documents_updated_at
    BEFORE UPDATE ON public.knowledge_documents
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 24. knowledge_chunks
-- Reference knowledge chunks with 384-dimensional pgvector embeddings for CDSS RAG
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    title VARCHAR(255),
    chunk_text TEXT NOT NULL,
    chunk_index INT NOT NULL,
    embedding vector(384),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_url TEXT,
    publication_date DATE,
    version VARCHAR(50),
    page_number INT,
    section_reference VARCHAR(255),
    license_info TEXT,
    specialty_tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    agent_tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 25. knowledge_ingestion_jobs
-- Background batch jobs tracking literature and guideline ingestion
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    chunks_created INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- 1. Foreign Key and Query Indexes
CREATE INDEX IF NOT EXISTS idx_app_users_auth_user_id ON public.app_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON public.app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON public.app_users(email);

CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON public.doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON public.doctors(specialty);

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_identifier ON public.patients(patient_identifier);
CREATE INDEX IF NOT EXISTS idx_patients_full_name ON public.patients(full_name);

CREATE INDEX IF NOT EXISTS idx_pda_patient_id ON public.patient_doctor_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_pda_doctor_id ON public.patient_doctor_assignments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_pda_status ON public.patient_doctor_assignments(assignment_status);

CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON public.encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_doctor_id ON public.encounters(doctor_id);
CREATE INDEX IF NOT EXISTS idx_encounters_date ON public.encounters(encounter_date DESC);
CREATE INDEX IF NOT EXISTS idx_encounters_status ON public.encounters(clinical_status);

CREATE INDEX IF NOT EXISTS idx_vitals_patient_id ON public.vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_encounter_id ON public.vitals(encounter_id);
CREATE INDEX IF NOT EXISTS idx_vitals_recorded_at ON public.vitals(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_conditions_patient_id ON public.conditions(patient_id);
CREATE INDEX IF NOT EXISTS idx_conditions_code ON public.conditions(condition_code);
CREATE INDEX IF NOT EXISTS idx_conditions_status ON public.conditions(condition_status);

CREATE INDEX IF NOT EXISTS idx_allergies_patient_id ON public.allergies(patient_id);
CREATE INDEX IF NOT EXISTS idx_allergies_allergen ON public.allergies(allergen);

CREATE INDEX IF NOT EXISTS idx_medications_patient_id ON public.medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_code ON public.medications(medication_code);
CREATE INDEX IF NOT EXISTS idx_medications_status ON public.medications(status);

CREATE INDEX IF NOT EXISTS idx_med_orders_patient_id ON public.medication_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_med_orders_encounter_id ON public.medication_orders(encounter_id);
CREATE INDEX IF NOT EXISTS idx_med_orders_doctor_id ON public.medication_orders(doctor_id);
CREATE INDEX IF NOT EXISTS idx_med_orders_status ON public.medication_orders(order_status);

CREATE INDEX IF NOT EXISTS idx_medical_files_patient_id ON public.medical_files(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_files_encounter_id ON public.medical_files(encounter_id);
CREATE INDEX IF NOT EXISTS idx_medical_files_uploaded_by ON public.medical_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_medical_files_status ON public.medical_files(processing_status);

CREATE INDEX IF NOT EXISTS idx_lab_results_patient_id ON public.lab_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_encounter_id ON public.lab_results(encounter_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_source_file ON public.lab_results(source_file_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_code ON public.lab_results(test_code);
CREATE INDEX IF NOT EXISTS idx_lab_results_date ON public.lab_results(result_date DESC);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient_id ON public.clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_encounter_id ON public.clinical_notes(encounter_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_doctor_id ON public.clinical_notes(doctor_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_type ON public.clinical_notes(note_type);

CREATE INDEX IF NOT EXISTS idx_ai_workflows_patient_id ON public.ai_workflows(patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_workflows_encounter_id ON public.ai_workflows(encounter_id);
CREATE INDEX IF NOT EXISTS idx_ai_workflows_status ON public.ai_workflows(workflow_status);

CREATE INDEX IF NOT EXISTS idx_agent_runs_workflow_id ON public.agent_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_patient_id ON public.agent_runs(patient_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_encounter_id ON public.agent_runs(encounter_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON public.agent_runs(execution_status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_name ON public.agent_runs(agent_name);

CREATE INDEX IF NOT EXISTS idx_doc_extractions_file_id ON public.document_extractions(medical_file_id);
CREATE INDEX IF NOT EXISTS idx_doc_extractions_agent_run ON public.document_extractions(agent_run_id);
CREATE INDEX IF NOT EXISTS idx_doc_extractions_status ON public.document_extractions(extraction_status);

CREATE INDEX IF NOT EXISTS idx_findings_patient_id ON public.clinical_findings(patient_id);
CREATE INDEX IF NOT EXISTS idx_findings_encounter_id ON public.clinical_findings(encounter_id);
CREATE INDEX IF NOT EXISTS idx_findings_workflow_id ON public.clinical_findings(workflow_id);
CREATE INDEX IF NOT EXISTS idx_findings_agent_run_id ON public.clinical_findings(agent_run_id);
CREATE INDEX IF NOT EXISTS idx_findings_category ON public.clinical_findings(finding_category);

CREATE INDEX IF NOT EXISTS idx_reports_patient_id ON public.clinical_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_reports_encounter_id ON public.clinical_reports(encounter_id);
CREATE INDEX IF NOT EXISTS idx_reports_workflow_id ON public.clinical_reports(workflow_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.clinical_reports(status);

CREATE INDEX IF NOT EXISTS idx_report_reviews_report_id ON public.report_reviews(report_id);
CREATE INDEX IF NOT EXISTS idx_report_reviews_doctor_id ON public.report_reviews(doctor_id);
CREATE INDEX IF NOT EXISTS idx_report_reviews_status ON public.report_reviews(review_status);

CREATE INDEX IF NOT EXISTS idx_document_chunks_patient_id ON public.document_chunks(patient_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_encounter_id ON public.document_chunks(encounter_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_file_id ON public.document_chunks(medical_file_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_extraction_id ON public.document_chunks(extraction_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_patient_id ON public.audit_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kd_source_id ON public.knowledge_documents(source_id);
CREATE INDEX IF NOT EXISTS idx_kd_status ON public.knowledge_documents(ingestion_status);
CREATE INDEX IF NOT EXISTS idx_kd_category ON public.knowledge_documents(category);

CREATE INDEX IF NOT EXISTS idx_kc_document_id ON public.knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_kc_source_id ON public.knowledge_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_kc_category ON public.knowledge_chunks(category);

CREATE INDEX IF NOT EXISTS idx_kij_document_id ON public.knowledge_ingestion_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_kij_status ON public.knowledge_ingestion_jobs(status);

-- -----------------------------------------------------------------------------
-- 2. HNSW Indexes on Vector Embeddings (384 Dimensions, Cosine Similarity)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw 
    ON public.document_chunks 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_hnsw 
    ON public.knowledge_chunks 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- -----------------------------------------------------------------------------
-- 3. GIN Indexes on JSONB and Array Columns
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_doctors_contact_info_gin ON public.doctors USING gin (contact_info);
CREATE INDEX IF NOT EXISTS idx_patients_contact_info_gin ON public.patients USING gin (contact_info);
CREATE INDEX IF NOT EXISTS idx_patients_emergency_contact_gin ON public.patients USING gin (emergency_contact);
CREATE INDEX IF NOT EXISTS idx_encounters_symptoms_gin ON public.encounters USING gin (symptoms);
CREATE INDEX IF NOT EXISTS idx_medical_files_metadata_gin ON public.medical_files USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_structured_gin ON public.clinical_notes USING gin (structured_content);
CREATE INDEX IF NOT EXISTS idx_ai_workflows_config_gin ON public.ai_workflows USING gin (workflow_config);
CREATE INDEX IF NOT EXISTS idx_agent_runs_input_summary_gin ON public.agent_runs USING gin (input_summary);
CREATE INDEX IF NOT EXISTS idx_agent_runs_output_data_gin ON public.agent_runs USING gin (output_data);
CREATE INDEX IF NOT EXISTS idx_doc_extractions_structured_gin ON public.document_extractions USING gin (structured_data);
CREATE INDEX IF NOT EXISTS idx_findings_evidence_gin ON public.clinical_findings USING gin (evidence);
CREATE INDEX IF NOT EXISTS idx_reports_structured_gin ON public.clinical_reports USING gin (structured_report);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_metadata_gin ON public.document_chunks USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata_gin ON public.audit_logs USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_kd_specialty_tags_gin ON public.knowledge_documents USING gin (specialty_tags);
CREATE INDEX IF NOT EXISTS idx_kd_agent_tags_gin ON public.knowledge_documents USING gin (agent_tags);
CREATE INDEX IF NOT EXISTS idx_kd_metadata_gin ON public.knowledge_documents USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_kc_specialty_tags_gin ON public.knowledge_chunks USING gin (specialty_tags);
CREATE INDEX IF NOT EXISTS idx_kc_agent_tags_gin ON public.knowledge_chunks USING gin (agent_tags);
CREATE INDEX IF NOT EXISTS idx_kc_metadata_gin ON public.knowledge_chunks USING gin (metadata);
