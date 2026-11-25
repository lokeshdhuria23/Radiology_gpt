-- =============================================================================
-- Migration 003: Row Level Security (RLS) & Access Control
-- Project: Clinical Decision Support System (CDSS) - Radiology GPT
-- Description: Enables RLS on ALL 25 tables and establishes comprehensive
--              security policies:
--              1. Admins have unrestricted system access.
--              2. Doctors can access ONLY data for their assigned patients.
--              3. Patients can access ONLY their own records.
--              4. Security Definer helper functions optimize evaluation.
-- =============================================================================

SET search_path TO public, extensions;

-- =============================================================================
-- 1. Helper Security Functions (SECURITY DEFINER for recursion-free lookup)
-- =============================================================================

-- Returns the role of an authenticated user from app_users
CREATE OR REPLACE FUNCTION public.get_user_role(auth_uid UUID)
RETURNS VARCHAR AS $$
    SELECT role 
    FROM public.app_users 
    WHERE auth_user_id = auth_uid 
      AND is_active = true 
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Returns the app_users.id for a given auth.users.id
CREATE OR REPLACE FUNCTION public.get_user_id(auth_uid UUID)
RETURNS UUID AS $$
    SELECT id 
    FROM public.app_users 
    WHERE auth_user_id = auth_uid 
      AND is_active = true 
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Checks if the user is an active Administrator (or service_role)
CREATE OR REPLACE FUNCTION public.is_admin(auth_uid UUID)
RETURNS BOOLEAN AS $$
    SELECT (auth.jwt() ->> 'role' = 'service_role') OR EXISTS (
        SELECT 1 
        FROM public.app_users 
        WHERE auth_user_id = auth_uid 
          AND role = 'admin' 
          AND is_active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Checks if the user is an active Doctor
CREATE OR REPLACE FUNCTION public.is_doctor(auth_uid UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.app_users 
        WHERE auth_user_id = auth_uid 
          AND role = 'doctor' 
          AND is_active = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Resolves doctor ID from auth_uid
CREATE OR REPLACE FUNCTION public.get_doctor_id(auth_uid UUID)
RETURNS UUID AS $$
    SELECT d.id 
    FROM public.doctors d
    JOIN public.app_users u ON d.user_id = u.id
    WHERE u.auth_user_id = auth_uid 
      AND u.is_active = true 
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Resolves patient ID from auth_uid
CREATE OR REPLACE FUNCTION public.get_patient_id(auth_uid UUID)
RETURNS UUID AS $$
    SELECT p.id 
    FROM public.patients p
    JOIN public.app_users u ON p.user_id = u.id
    WHERE u.auth_user_id = auth_uid 
      AND u.is_active = true 
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Validates whether a doctor has an active assignment to a specific patient
CREATE OR REPLACE FUNCTION public.doctor_has_patient_access(p_patient_id UUID, auth_uid UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.patient_doctor_assignments pda
        JOIN public.doctors d ON pda.doctor_id = d.id
        JOIN public.app_users u ON d.user_id = u.id
        WHERE pda.patient_id = p_patient_id 
          AND u.auth_user_id = auth_uid 
          AND u.is_active = true
          AND pda.assignment_status = 'active'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================================================
-- 2. Enable RLS on ALL 25 Tables
-- =============================================================================
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_doctor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_ingestion_jobs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. RLS Policies
-- =============================================================================

-- -----------------------------------------------------------------------------
-- app_users
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_app_users" ON public.app_users
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "user_select_self" ON public.app_users
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid() OR public.is_doctor(auth.uid()) OR public.get_user_role(auth.uid()) = 'staff');

CREATE POLICY "user_update_self" ON public.app_users
    FOR UPDATE TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- doctors
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_doctors" ON public.doctors
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "doctors_viewable_by_authenticated" ON public.doctors
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "doctor_update_own_profile" ON public.doctors
    FOR UPDATE TO authenticated
    USING (user_id = public.get_user_id(auth.uid()))
    WITH CHECK (user_id = public.get_user_id(auth.uid()));

-- -----------------------------------------------------------------------------
-- patients
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_patients" ON public.patients
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "doctor_manage_assigned_patients" ON public.patients
    FOR SELECT TO authenticated
    USING (public.doctor_has_patient_access(id, auth.uid()));

CREATE POLICY "doctor_insert_patients" ON public.patients
    FOR INSERT TO authenticated
    WITH CHECK (public.is_doctor(auth.uid()));

CREATE POLICY "doctor_update_assigned_patients" ON public.patients
    FOR UPDATE TO authenticated
    USING (public.doctor_has_patient_access(id, auth.uid()))
    WITH CHECK (public.doctor_has_patient_access(id, auth.uid()));

CREATE POLICY "patient_view_own_record" ON public.patients
    FOR SELECT TO authenticated
    USING (id = public.get_patient_id(auth.uid()));

CREATE POLICY "patient_update_own_record" ON public.patients
    FOR UPDATE TO authenticated
    USING (id = public.get_patient_id(auth.uid()))
    WITH CHECK (id = public.get_patient_id(auth.uid()));

-- -----------------------------------------------------------------------------
-- patient_doctor_assignments
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_pda" ON public.patient_doctor_assignments
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "doctor_view_own_assignments" ON public.patient_doctor_assignments
    FOR SELECT TO authenticated
    USING (doctor_id = public.get_doctor_id(auth.uid()));

CREATE POLICY "doctor_manage_own_assignments" ON public.patient_doctor_assignments
    FOR INSERT TO authenticated
    WITH CHECK (doctor_id = public.get_doctor_id(auth.uid()));

CREATE POLICY "doctor_update_own_assignments" ON public.patient_doctor_assignments
    FOR UPDATE TO authenticated
    USING (doctor_id = public.get_doctor_id(auth.uid()))
    WITH CHECK (doctor_id = public.get_doctor_id(auth.uid()));

CREATE POLICY "patient_view_own_assignments" ON public.patient_doctor_assignments
    FOR SELECT TO authenticated
    USING (patient_id = public.get_patient_id(auth.uid()));

-- -----------------------------------------------------------------------------
-- encounters
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_encounters" ON public.encounters
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "doctor_all_assigned_encounters" ON public.encounters
    FOR ALL TO authenticated
    USING (public.doctor_has_patient_access(patient_id, auth.uid()))
    WITH CHECK (public.doctor_has_patient_access(patient_id, auth.uid()));

CREATE POLICY "patient_view_own_encounters" ON public.encounters
    FOR SELECT TO authenticated
    USING (patient_id = public.get_patient_id(auth.uid()));

-- -----------------------------------------------------------------------------
-- vitals
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_vitals" ON public.vitals
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "doctor_all_assigned_vitals" ON public.vitals
    FOR ALL TO authenticated
    USING (public.doctor_has_patient_access(patient_id, auth.uid()))
    WITH CHECK (public.doctor_has_patient_access(patient_id, auth.uid()));

CREATE POLICY "patient_view_own_vitals" ON public.vitals
    FOR SELECT TO authenticated
    USING (patient_id = public.get_patient_id(auth.uid()));

-- -----------------------------------------------------------------------------
-- conditions
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_conditions" ON public.conditions
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "doctor_all_assigned_conditions" ON public.conditions
    FOR ALL TO authenticated
    USING (public.doctor_has_patient_access(patient_id, auth.uid()))
    WITH CHECK (public.doctor_has_patient_access(patient_id, auth.uid()));

CREATE POLICY "patient_view_own_conditions" ON public.conditions
    FOR SELECT TO authenticated
    USING (patient_id = public.get_patient_id(auth.uid()));

-- -----------------------------------------------------------------------------
-- allergies
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_allergies" ON public.allergies
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "doctor_all_assigned_allergies" ON public.allergies
    FOR ALL TO authenticated
    USING (public.doctor_has_patient_access(patient_id, auth.uid()))
    WITH CHECK (public.doctor_has_patient_access(patient_id, auth.uid()));

CREATE POLICY "patient_view_own_allergies" ON public.allergies
    FOR SELECT TO authenticated
    USING (patient_id = public.get_patient_id(auth.uid()));

-- -----------------------------------------------------------------------------
-- medications
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_medications" ON public.medications
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "doctor_all_assigned_medications" ON public.medications
    FOR ALL TO authenticated
    USING (public.doctor_has_patient_access(patient_id, auth.uid()))
    WITH CHECK (public.doctor_has_patient_access(patient_id, auth.uid()));

CREATE POLICY "patient_view_own_medications" ON public.medications
    FOR SELECT TO authenticated
    USING (patient_id = public.get_patient_id(auth.uid()));

-- -----------------------------------------------------------------------------
-- medication_orders
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_medication_orders" ON public.medication_orders
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "doctor_all_assigned_med_orders" ON public.medication_orders
    FOR ALL TO authenticated
    USING (public.doctor_has_patient_access(patient_id, auth.uid()))
    WITH CHECK (public.doctor_has_patient_access(patient_id, auth.uid()));

CREATE POLICY "patient_view_own_med_orders" ON public.medication_orders
    FOR SELECT TO authenticated
    USING (patient_id = public.get_patient_id(auth.uid()));

-- -----------------------------------------------------------------------------
-- medical_files
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_medical_files" ON public.medical_files
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "doctor_all_assigned_medical_files" ON public.medical_files
    FOR ALL TO authenticated
    USING (public.doctor_has_patient_access(patient_id, auth.uid()))
    WITH CHECK (public.doctor_has_patient_access(patient_id, auth.uid()));

CREATE POLICY "patient_view_own_medical_files" ON public.medical_files
    FOR SELECT TO authenticated
    USING (patient_id = public.get_patient_id(auth.uid()));

-- -----------------------------------------------------------------------------
-- lab_results
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_lab_results" ON public.lab_results
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "doctor_all_assigned_lab_results" ON public.lab_results
    FOR ALL TO authenticated
    USING (public.doctor_has_patient_access(patient_id, auth.uid()))
    WITH CHECK (public.doctor_has_patient_access(patient_id, auth.uid()));

CREATE POLICY "patient_view_own_lab_results" ON public.lab_results
    FOR SELECT TO authenticated
    USING (patient_id = public.get_patient_id(auth.uid()));

-- -----------------------------------------------------------------------------
-- clinical_notes
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_clinical_notes" ON public.clinical_notes
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "doctor_all_assigned_clinical_notes" ON public.clinical_notes
    FOR ALL TO authenticated
    USING (public.doctor_has_patient_access(patient_id, auth.uid()))
    WITH CHECK (public.doctor_has_patient_access(patient_id, auth.uid()));

CREATE POLICY "patient_view_final_clinical_notes" ON public.clinical_notes
    FOR SELECT TO authenticated
    USING (patient_id = public.get_patient_id(auth.uid()) AND status IN ('final', 'amended'));

-- -----------------------------------------------------------------------------
-- ai_workflows
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_ai_workflows" ON public.ai_workflows
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "doctor_all_assigned_ai_workflows" ON public.ai_workflows
    FOR ALL TO authenticated
    USING (public.doctor_has_patient_access(patient_id, auth.uid()))
    WITH CHECK (public.doctor_has_patient_access(patient_id, auth.uid()));

-- -----------------------------------------------------------------------------
-- agent_runs
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_agent_runs" ON public.agent_runs
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "doctor_all_assigned_agent_runs" ON public.agent_runs
    FOR ALL TO authenticated
    USING (public.doctor_has_patient_access(patient_id, auth.uid()))
    WITH CHECK (public.doctor_has_patient_access(patient_id, auth.uid()));

-- -----------------------------------------------------------------------------
-- document_extractions
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_doc_extractions" ON public.document_extractions
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "doctor_assigned_doc_extractions" ON public.document_extractions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.medical_files mf
            WHERE mf.id = medical_file_id 
              AND public.doctor_has_patient_access(mf.patient_id, auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.medical_files mf
            WHERE mf.id = medical_file_id 
              AND public.doctor_has_patient_access(mf.patient_id, auth.uid())
        )
    );

-- -----------------------------------------------------------------------------
-- clinical_findings
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_clinical_findings" ON public.clinical_findings
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "doctor_all_assigned_findings" ON public.clinical_findings
    FOR ALL TO authenticated
    USING (public.doctor_has_patient_access(patient_id, auth.uid()))
    WITH CHECK (public.doctor_has_patient_access(patient_id, auth.uid()));

CREATE POLICY "patient_view_confirmed_findings" ON public.clinical_findings
    FOR SELECT TO authenticated
    USING (patient_id = public.get_patient_id(auth.uid()) AND status = 'confirmed');

-- -----------------------------------------------------------------------------
-- clinical_reports
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_clinical_reports" ON public.clinical_reports
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "doctor_all_assigned_reports" ON public.clinical_reports
    FOR ALL TO authenticated
    USING (public.doctor_has_patient_access(patient_id, auth.uid()))
    WITH CHECK (public.doctor_has_patient_access(patient_id, auth.uid()));

CREATE POLICY "patient_view_finalized_reports" ON public.clinical_reports
    FOR SELECT TO authenticated
    USING (patient_id = public.get_patient_id(auth.uid()) AND status IN ('finalized', 'amended'));

-- -----------------------------------------------------------------------------
-- report_reviews
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_report_reviews" ON public.report_reviews
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "doctor_manage_report_reviews" ON public.report_reviews
    FOR ALL TO authenticated
    USING (
        doctor_id = public.get_doctor_id(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.clinical_reports r
            WHERE r.id = report_id 
              AND public.doctor_has_patient_access(r.patient_id, auth.uid())
        )
    )
    WITH CHECK (
        doctor_id = public.get_doctor_id(auth.uid())
    );

CREATE POLICY "patient_view_report_reviews" ON public.report_reviews
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.clinical_reports r
            WHERE r.id = report_id 
              AND r.patient_id = public.get_patient_id(auth.uid())
              AND r.status IN ('finalized', 'amended')
        )
    );

-- -----------------------------------------------------------------------------
-- document_chunks
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_document_chunks" ON public.document_chunks
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "doctor_all_assigned_document_chunks" ON public.document_chunks
    FOR ALL TO authenticated
    USING (public.doctor_has_patient_access(patient_id, auth.uid()))
    WITH CHECK (public.doctor_has_patient_access(patient_id, auth.uid()));

-- -----------------------------------------------------------------------------
-- audit_logs
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_audit_logs" ON public.audit_logs
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_insert_audit_logs" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (user_id = public.get_user_id(auth.uid()) OR user_id IS NULL);

CREATE POLICY "doctor_select_audit_logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        user_id = public.get_user_id(auth.uid()) OR 
        (patient_id IS NOT NULL AND public.doctor_has_patient_access(patient_id, auth.uid()))
    );

CREATE POLICY "patient_select_own_audit_logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (patient_id = public.get_patient_id(auth.uid()));

-- -----------------------------------------------------------------------------
-- knowledge_sources, knowledge_documents, knowledge_chunks, knowledge_ingestion_jobs
-- -----------------------------------------------------------------------------
CREATE POLICY "admin_all_knowledge_sources" ON public.knowledge_sources
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "users_read_knowledge_sources" ON public.knowledge_sources
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "admin_all_knowledge_documents" ON public.knowledge_documents
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "users_read_knowledge_documents" ON public.knowledge_documents
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "admin_all_knowledge_chunks" ON public.knowledge_chunks
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "users_read_knowledge_chunks" ON public.knowledge_chunks
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "admin_all_ingestion_jobs" ON public.knowledge_ingestion_jobs
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "staff_read_ingestion_jobs" ON public.knowledge_ingestion_jobs
    FOR SELECT TO authenticated
    USING (public.is_doctor(auth.uid()) OR public.get_user_role(auth.uid()) = 'staff');
