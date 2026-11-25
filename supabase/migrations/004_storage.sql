-- =============================================================================
-- Migration 004: Storage Configuration & Access Policies
-- Project: Clinical Decision Support System (CDSS) - Radiology GPT
-- Description: Configures private storage buckets ('medical-files' and 
--              'knowledge-base') and creates granular storage RLS policies
--              governing clinical document and reference literature access.
-- =============================================================================

SET search_path TO public, extensions;

-- -----------------------------------------------------------------------------
-- 1. Create Private Storage Buckets
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'medical-files',
        'medical-files',
        false,
        104857600, -- 100 MB max per clinical scan/file
        ARRAY[
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/dicom',
            'application/dicom',
            'application/octet-stream',
            'text/plain',
            'application/json'
        ]
    ),
    (
        'knowledge-base',
        'knowledge-base',
        false,
        104857600, -- 100 MB max per literature paper/guideline
        ARRAY[
            'application/pdf',
            'text/plain',
            'text/markdown',
            'application/json',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
    )
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- 2. Storage Policies: 'medical-files'
-- -----------------------------------------------------------------------------

-- Admin full access to medical files
CREATE POLICY "admin_all_medical_files_storage" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'medical-files' AND public.is_admin(auth.uid()))
    WITH CHECK (bucket_id = 'medical-files' AND public.is_admin(auth.uid()));

-- Doctors can read medical files for assigned patients
CREATE POLICY "doctor_select_medical_files_storage" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'medical-files' AND (
            public.is_doctor(auth.uid()) AND (
                -- Check against registered medical_files storage_path
                EXISTS (
                    SELECT 1 FROM public.medical_files mf
                    WHERE mf.storage_path = name 
                      AND public.doctor_has_patient_access(mf.patient_id, auth.uid())
                )
                OR
                -- Check against patient UUID folder prefix if folder format is {patient_id}/...
                (
                    (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                    AND public.doctor_has_patient_access(((storage.foldername(name))[1])::uuid, auth.uid())
                )
            )
        )
    );

-- Doctors can upload clinical files
CREATE POLICY "doctor_insert_medical_files_storage" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'medical-files' AND (
            public.is_doctor(auth.uid()) OR public.is_admin(auth.uid())
        )
    );

-- Doctors can update files for assigned patients
CREATE POLICY "doctor_update_medical_files_storage" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'medical-files' AND (
            public.is_doctor(auth.uid()) AND (
                EXISTS (
                    SELECT 1 FROM public.medical_files mf
                    WHERE mf.storage_path = name 
                      AND public.doctor_has_patient_access(mf.patient_id, auth.uid())
                )
            )
        )
    );

-- Patients can view their own medical files
CREATE POLICY "patient_select_medical_files_storage" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'medical-files' AND (
            -- Check against registered medical_files storage_path
            EXISTS (
                SELECT 1 FROM public.medical_files mf
                WHERE mf.storage_path = name 
                  AND mf.patient_id = public.get_patient_id(auth.uid())
            )
            OR
            -- Check against patient UUID folder prefix
            (
                (storage.foldername(name))[1] = (public.get_patient_id(auth.uid()))::text
            )
        )
    );

-- -----------------------------------------------------------------------------
-- 3. Storage Policies: 'knowledge-base'
-- -----------------------------------------------------------------------------

-- Admin full access to knowledge base storage
CREATE POLICY "admin_all_knowledge_base_storage" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'knowledge-base' AND public.is_admin(auth.uid()))
    WITH CHECK (bucket_id = 'knowledge-base' AND public.is_admin(auth.uid()));

-- All authenticated clinicians and staff can read reference literature
CREATE POLICY "authenticated_select_knowledge_base_storage" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'knowledge-base');

-- Admin and clinical staff can upload reference materials
CREATE POLICY "staff_insert_knowledge_base_storage" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'knowledge-base' AND (
            public.is_admin(auth.uid()) OR public.get_user_role(auth.uid()) = 'staff' OR public.is_doctor(auth.uid())
        )
    );
