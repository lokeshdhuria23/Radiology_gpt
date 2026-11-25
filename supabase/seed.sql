-- =============================================================================
-- Supabase Demo Seed Data
-- Project: Clinical Decision Support System (CDSS) - Radiology GPT
-- Description: Inserts deterministic demo data for system testing & demonstration.
--              ALL records are fictional / synthetic and marked as DEMO DATA.
-- =============================================================================

SET search_path TO public, extensions, auth;

-- -----------------------------------------------------------------------------
-- Temporary Deterministic Vector Generator Helper
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_vector(p_seed float)
RETURNS vector(384) AS $$
    SELECT ('[' || string_agg(round((sin(i * p_seed)::numeric), 4)::text, ',') || ']')::vector(384)
    FROM generate_series(1, 384) i;
$$ LANGUAGE sql IMMUTABLE;

-- -----------------------------------------------------------------------------
-- 1. auth.users (Supabase Auth Mock Accounts)
-- Password for all demo accounts: 'DemoPassword123!'
-- -----------------------------------------------------------------------------
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES 
    (
        '00000000-0000-0000-0000-000000000000',
        'a0000000-0000-0000-0000-000000000001',
        'a0thenticated',
        'a0thenticated',
        'admin@demo.com',
        crypt('DemoPassword123!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"System Administrator","demo":true}'::jsonb,
        now(),
        now()
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        'a0000000-0000-0000-0000-000000000002',
        'a0thenticated',
        'a0thenticated',
        'dr.smith@demo.com',
        crypt('DemoPassword123!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Dr. Sarah Smith, MD","specialty":"Neuroradiology","demo":true}'::jsonb,
        now(),
        now()
    ),
    (
        '00000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000003',
        'a0thenticated',
        'a0thenticated',
        'dr.patel@demo.com',
        crypt('DemoPassword123!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Dr. Raj Patel, MD","specialty":"Thoracic Radiology & Pulmonology","demo":true}'::jsonb,
        now(),
        now()
    ),
    (
        '00000000-0000-0000-0000-000000000004',
        'a0000000-0000-0000-0000-000000000004',
        'a0thenticated',
        'a0thenticated',
        'sarah.johnson@demo.com',
        crypt('DemoPassword123!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Sarah Johnson","patient_identifier":"PT-10021","demo":true}'::jsonb,
        now(),
        now()
    ),
    (
        '00000000-0000-0000-0000-000000000005',
        'a0000000-0000-0000-0000-000000000005',
        'a0thenticated',
        'a0thenticated',
        'michael.chen@demo.com',
        crypt('DemoPassword123!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Michael Chen","patient_identifier":"PT-10045","demo":true}'::jsonb,
        now(),
        now()
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. app_users
-- -----------------------------------------------------------------------------
INSERT INTO public.app_users (id, auth_user_id, username, email, role, is_active, created_at, updated_at)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'admin_sys', 'admin@demo.com', 'admin', true, now(), now()),
    ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'dr_smith', 'dr.smith@demo.com', 'doctor', true, now(), now()),
    ('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'dr_patel', 'dr.patel@demo.com', 'doctor', true, now(), now()),
    ('10000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'patient_sjohnson', 'sarah.johnson@demo.com', 'patient', true, now(), now()),
    ('10000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 'patient_mchen', 'michael.chen@demo.com', 'patient', true, now(), now())
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role;

-- -----------------------------------------------------------------------------
-- 3. doctors
-- -----------------------------------------------------------------------------
INSERT INTO public.doctors (id, user_id, full_name, specialty, qualifications, contact_info, created_at, updated_at)
VALUES
    (
        'd0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000002',
        'Dr. Sarah Smith, MD',
        'Neuroradiology & Diagnostic Imaging',
        'MD (Harvard Medical School), FACR, Board Certified in Diagnostic Radiology, Subspecialty Certification in Neuroradiology',
        '{"phone": "+1-555-0101", "office": "Tower B, Room 402, Imaging Sciences", "pager": "1042", "npi": "1942039102"}'::jsonb,
        now(),
        now()
    ),
    (
        'd0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000003',
        'Dr. Raj Patel, MD',
        'Thoracic Radiology & Pulmonology',
        'MD (Johns Hopkins), FCCP, Dual Board Certified in Diagnostic Radiology and Pulmonary Medicine',
        '{"phone": "+1-555-0102", "office": "East Wing, Suite 305, Chest Center", "pager": "2088", "npi": "1831092841"}'::jsonb,
        now(),
        now()
    )
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, specialty = EXCLUDED.specialty;

-- -----------------------------------------------------------------------------
-- 4. patients (5 Fictional Patients with Detailed Medical Context)
-- -----------------------------------------------------------------------------
INSERT INTO public.patients (id, user_id, patient_identifier, full_name, date_of_birth, sex, contact_info, address, emergency_contact, created_at, updated_at)
VALUES
    (
        '20000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000004',
        'PT-10021',
        'Sarah Johnson',
        '1982-05-14',
        'Female',
        '{"phone": "+1-555-0201", "email": "sarah.johnson@demo.com", "preferred_language": "English"}'::jsonb,
        '742 Evergreen Terrace, Springfield, OR 97477',
        '{"name": "Mark Johnson", "relation": "Spouse", "phone": "+1-555-0202"}'::jsonb,
        now(),
        now()
    ),
    (
        '20000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000005',
        'PT-10045',
        'Michael Chen',
        '1968-11-23',
        'Male',
        '{"phone": "+1-555-0211", "email": "michael.chen@demo.com", "preferred_language": "English"}'::jsonb,
        '350 5th Avenue, New York, NY 10118',
        '{"name": "Grace Chen", "relation": "Daughter", "phone": "+1-555-0212"}'::jsonb,
        now(),
        now()
    ),
    (
        '20000000-0000-0000-0000-000000000003',
        NULL,
        'PT-10089',
        'Emily Rodriguez',
        '1995-03-30',
        'Female',
        '{"phone": "+1-555-0221", "email": "emily.rodriguez@fictional-demo.org", "preferred_language": "English"}'::jsonb,
        '1200 Grand Concourse, Bronx, NY 10456',
        '{"name": "Carlos Rodriguez", "relation": "Brother", "phone": "+1-555-0222"}'::jsonb,
        now(),
        now()
    ),
    (
        '20000000-0000-0000-0000-000000000004',
        NULL,
        'PT-10112',
        'James Williams',
        '1955-08-12',
        'Male',
        '{"phone": "+1-555-0231", "email": "james.williams@fictional-demo.org", "preferred_language": "English"}'::jsonb,
        '88 Ocean Avenue, Santa Monica, CA 90401',
        '{"name": "Eleanor Williams", "relation": "Spouse", "phone": "+1-555-0232"}'::jsonb,
        now(),
        now()
    ),
    (
        '20000000-0000-0000-0000-000000000005',
        NULL,
        'PT-10164',
        'Aisha Patel',
        '1991-07-08',
        'Female',
        '{"phone": "+1-555-0241", "email": "aisha.patel@fictional-demo.org", "preferred_language": "English"}'::jsonb,
        '420 West Lake Street, Chicago, IL 60606',
        '{"name": "Zubair Patel", "relation": "Father", "phone": "+1-555-0242"}'::jsonb,
        now(),
        now()
    )
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- -----------------------------------------------------------------------------
-- 5. patient_doctor_assignments
-- -----------------------------------------------------------------------------
INSERT INTO public.patient_doctor_assignments (id, patient_id, doctor_id, assignment_status, assigned_at, created_at)
VALUES
    ('c0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'active', now() - interval '90 days', now() - interval '90 days'),
    ('c0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'active', now() - interval '120 days', now() - interval '120 days'),
    ('c0000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'active', now() - interval '30 days', now() - interval '30 days'),
    ('c0000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'active', now() - interval '60 days', now() - interval '60 days'),
    ('c0000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000002', 'active', now() - interval '45 days', now() - interval '45 days')
ON CONFLICT (patient_id, doctor_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. encounters (12 Total: 2-3 per patient)
-- -----------------------------------------------------------------------------
INSERT INTO public.encounters (id, patient_id, doctor_id, encounter_date, encounter_type, chief_complaint, symptoms, clinical_status, notes, created_at, updated_at)
VALUES
    -- Sarah Johnson (3 encounters)
    (
        'e0000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001',
        now() - interval '85 days',
        'Specialist Consultation',
        'Subacute visual impairment in left eye with retrobulbar pain on movement and progressive left leg paresthesia',
        '["left optic neuritis", "paresthesia left lower extremity", "fatigue", "Lhermitte phenomenon"]'::jsonb,
        'completed',
        'DEMO DATA: Initial neurology encounter. Evaluated for suspected demyelinating disease. Urgent Brain and Spine MRI ordered.',
        now() - interval '85 days',
        now() - interval '85 days'
    ),
    (
        'e0000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001',
        now() - interval '70 days',
        'Diagnostic Follow-up',
        'Review of brain and cervical spinal cord MRI with AI-assisted lesion segmentation',
        '["mild residual visual blurriness", "intermittent tingling"]'::jsonb,
        'completed',
        'DEMO DATA: Review of 3T MRI brain scan demonstrating periventricular lesions and Dawson fingers fulfilling McDonald 2017 criteria.',
        now() - interval '70 days',
        now() - interval '70 days'
    ),
    (
        'e0000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001',
        now() - interval '10 days',
        'Disease Monitoring',
        'Quarterly surveillance on disease-modifying therapy (Copaxone)',
        '["well tolerated medication", "no new focal neurological deficits"]'::jsonb,
        'completed',
        'DEMO DATA: Patient stable on Glatiramer acetate. EDSS score stable at 1.5. No acute exacerbation.',
        now() - interval '10 days',
        now() - interval '10 days'
    ),

    -- Michael Chen (3 encounters)
    (
        'e0000000-0000-0000-0000-000000000004',
        '20000000-0000-0000-0000-000000000002',
        'd0000000-0000-0000-0000-000000000002',
        now() - interval '115 days',
        'Urgent Care / Pulmonology',
        'Progressive shortness of breath on exertion and persistent productive morning cough with clear sputum',
        '["dyspnea on climbing stairs", "chronic wheezing", "morning cough", "chest tightness"]'::jsonb,
        'completed',
        'DEMO DATA: 40 pack-year smoking history. High-resolution chest CT and comprehensive pulmonary function testing requested.',
        now() - interval '115 days',
        now() - interval '115 days'
    ),
    (
        'e0000000-0000-0000-0000-000000000005',
        '20000000-0000-0000-0000-000000000002',
        'd0000000-0000-0000-0000-000000000002',
        now() - interval '65 days',
        'Diagnostic Follow-up',
        'Chest CT imaging review for solitary pulmonary nodule and emphysema staging',
        '["improved exertional dyspnea with bronchodilator", "mild exercise intolerance"]'::jsonb,
        'completed',
        'DEMO DATA: Chest CT shows 6.2 mm RUL non-calcified nodule (Lung-RADS 3) and moderate centrilobular emphysema. Repeat CT in 6 months.',
        now() - interval '65 days',
        now() - interval '65 days'
    ),
    (
        'e0000000-0000-0000-0000-000000000006',
        '20000000-0000-0000-0000-000000000002',
        'd0000000-0000-0000-0000-000000000002',
        now() - interval '15 days',
        'Routine Outpatient Checkup',
        'Management of chronic COPD and cardiovascular risk factors',
        '["stable respiratory status", "occasional nocturnal cough"]'::jsonb,
        'completed',
        'DEMO DATA: Spirometry shows stable FEV1 at 62% predicted. Triple therapy optimization discussed.',
        now() - interval '15 days',
        now() - interval '15 days'
    ),

    -- Emily Rodriguez (2 encounters)
    (
        'e0000000-0000-0000-0000-000000000007',
        '20000000-0000-0000-0000-000000000003',
        'd0000000-0000-0000-0000-000000000001',
        now() - interval '25 days',
        'Emergency Department Encounter',
        'Acute right lower quadrant abdominal pain radiating from periumbilical area, accompanied by nausea and low-grade fever',
        '["RLQ tenderness", "McBurney point positive", "rebound tenderness", "nausea", "anorexia"]'::jsonb,
        'completed',
        'DEMO DATA: Acute appendicitis confirmed on emergency abdominal graded-compression ultrasound. Laparoscopic appendectomy performed.',
        now() - interval '25 days',
        now() - interval '25 days'
    ),
    (
        'e0000000-0000-0000-0000-000000000008',
        '20000000-0000-0000-0000-000000000003',
        'd0000000-0000-0000-0000-000000000001',
        now() - interval '8 days',
        'Post-Operative Follow-up',
        'Two-week post-appendectomy recovery evaluation',
        '["surgical incisions healing well", "pain resolved", "normal diet tolerated"]'::jsonb,
        'completed',
        'DEMO DATA: Post-operative course unremarkable. Incisions clean and intact. Cleared for normal activity.',
        now() - interval '8 days',
        now() - interval '8 days'
    ),

    -- James Williams (2 encounters)
    (
        'e0000000-0000-0000-0000-000000000009',
        '20000000-0000-0000-0000-000000000004',
        'd0000000-0000-0000-0000-000000000001',
        now() - interval '55 days',
        'Acute Neurovascular Encounter',
        'Sudden onset left-sided facial droop and left arm heaviness lasting 45 minutes prior to arrival',
        '["left hemiparesis", "mild dysarthria", "left facial flattening", "NIHSS score 4"]'::jsonb,
        'completed',
        'DEMO DATA: Acute ischemic stroke evaluation. Emergency NCCT head and CTA head & neck performed.',
        now() - interval '55 days',
        now() - interval '55 days'
    ),
    (
        'e0000000-0000-0000-0000-000000000010',
        '20000000-0000-0000-0000-000000000004',
        'd0000000-0000-0000-0000-000000000001',
        now() - interval '12 days',
        'Rehabilitation & Secondary Prevention',
        'Follow-up for post-stroke motor rehabilitation and secondary stroke prevention',
        '["mild left hand clumsiness", "no recurrent transient ischemic episodes"]'::jsonb,
        'completed',
        'DEMO DATA: Patient demonstrating solid recovery. Continuing Eliquis for non-valvular AFib. Physical therapy ongoing.',
        now() - interval '12 days',
        now() - interval '12 days'
    ),

    -- Aisha Patel (2 encounters)
    (
        'e0000000-0000-0000-0000-000000000011',
        '20000000-0000-0000-0000-000000000005',
        'd0000000-0000-0000-0000-000000000002',
        now() - interval '40 days',
        'Rheumatology / Thoracic Consultation',
        'Sharp left-sided pleuritic chest pain on inspiration, malar facial erythema, and bilateral wrist arthralgia',
        '["pleuritic chest pain", "malar rash", "photosensitivity", "bilateral symmetric wrist swelling"]'::jsonb,
        'completed',
        'DEMO DATA: SLE flare with suspected lupus pleuritis. Chest x-ray and renal ultrasound ordered along with serology.',
        now() - interval '40 days',
        now() - interval '40 days'
    ),
    (
        'e0000000-0000-0000-0000-000000000012',
        '20000000-0000-0000-0000-000000000005',
        'd0000000-0000-0000-0000-000000000002',
        now() - interval '5 days',
        'Treatment Response Review',
        'Assessment of response to immunosuppressive therapy and resolution of pleuritic chest discomfort',
        '["resolution of pleuritic pain", "decreased joint stiffness", "minimal residual facial rash"]'::jsonb,
        'completed',
        'DEMO DATA: Significant clinical improvement on Plaquenil and low-dose Prednisone. Renal labs stable.',
        now() - interval '5 days',
        now() - interval '5 days'
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. vitals (12 Records corresponding to encounters)
-- -----------------------------------------------------------------------------
INSERT INTO public.vitals (id, patient_id, encounter_id, recorded_at, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, respiratory_rate, temperature, oxygen_saturation, height, weight, bmi, notes, created_at)
VALUES
    -- Sarah Johnson
    ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', now() - interval '85 days', 132, 84, 76, 16, 36.8, 99.0, 168.0, 64.5, 22.86, 'DEMO: Baseline neurological vitals.', now() - interval '85 days'),
    ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', now() - interval '70 days', 126, 80, 72, 14, 36.7, 99.5, 168.0, 64.0, 22.68, 'DEMO: Follow-up vitals.', now() - interval '70 days'),
    ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', now() - interval '10 days', 122, 78, 70, 14, 36.6, 99.0, 168.0, 64.2, 22.75, 'DEMO: Stable surveillance vitals.', now() - interval '10 days'),

    -- Michael Chen
    ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000004', now() - interval '115 days', 144, 92, 88, 22, 37.1, 93.0, 175.0, 86.0, 28.08, 'DEMO: Tachypneic with borderline oxygen saturation on room air.', now() - interval '115 days'),
    ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005', now() - interval '65 days', 138, 86, 78, 18, 36.8, 95.5, 175.0, 85.0, 27.76, 'DEMO: Improved oxygenation after bronchodilator start.', now() - interval '65 days'),
    ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000006', now() - interval '15 days', 130, 82, 74, 16, 36.7, 96.0, 175.0, 84.5, 27.59, 'DEMO: Outpatient stable vitals.', now() - interval '15 days'),

    -- Emily Rodriguez
    ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000007', now() - interval '25 days', 118, 76, 102, 20, 38.3, 99.0, 162.0, 56.0, 21.34, 'DEMO: Febrile (38.3C) and tachycardic (102 bpm) at ED presentation.', now() - interval '25 days'),
    ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000008', now() - interval '8 days', 114, 72, 72, 14, 36.7, 100.0, 162.0, 55.5, 21.15, 'DEMO: Post-op afebrile, normotensive.', now() - interval '8 days'),

    -- James Williams
    ('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000009', now() - interval '55 days', 168, 98, 96, 18, 36.9, 97.0, 178.0, 88.0, 27.77, 'DEMO: Hypertensive emergency during acute stroke code.', now() - interval '55 days'),
    ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000010', now() - interval '12 days', 134, 82, 68, 16, 36.6, 98.0, 178.0, 87.2, 27.52, 'DEMO: Blood pressure controlled on oral antihypertensive regimen.', now() - interval '12 days'),

    -- Aisha Patel
    ('30000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000011', now() - interval '40 days', 128, 84, 84, 18, 37.6, 97.5, 165.0, 58.0, 21.30, 'DEMO: Low-grade fever with pleuritic chest pain.', now() - interval '40 days'),
    ('30000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000012', now() - interval '5 days', 120, 78, 72, 14, 36.6, 99.0, 165.0, 58.5, 21.49, 'DEMO: Afebrile, vitals normalized.', now() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. conditions (15 Total: 2-4 per patient)
-- -----------------------------------------------------------------------------
INSERT INTO public.conditions (id, patient_id, condition_name, condition_code, condition_status, onset_date, resolved_date, source, notes, created_at, updated_at)
VALUES
    -- Sarah Johnson (3)
    ('cd000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Relapsing-Remitting Multiple Sclerosis', 'G35', 'active', '2025-06-15', NULL, 'Neurology Clinical Evaluation', 'DEMO: Confirmed by McDonald 2017 criteria with dissemination in space and time.', now(), now()),
    ('cd000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Chronic Migraine without Aura', 'G43.009', 'active', '2018-03-20', NULL, 'Neurology Clinic', 'DEMO: Managed with acute triptan therapy.', now(), now()),
    ('cd000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Essential Primary Hypertension', 'I10', 'active', '2021-09-10', NULL, 'Primary Care EHR', 'DEMO: Controlled with Lisinopril 10 mg daily.', now(), now()),

    -- Michael Chen (3)
    ('cd000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'Chronic Obstructive Pulmonary Disease, Stage II', 'J44.1', 'active', '2022-04-18', NULL, 'Pulmonary Function Lab', 'DEMO: GOLD Group B, moderate airflow limitation.', now(), now()),
    ('cd000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', 'Atherosclerotic Heart Disease', 'I25.10', 'active', '2019-11-05', NULL, 'Cardiology Records', 'DEMO: Non-obstructive coronary disease, on statin and antiplatelet.', now(), now()),
    ('cd000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', 'Type 2 Diabetes Mellitus without complications', 'E11.9', 'active', '2016-01-22', NULL, 'Endocrinology Records', 'DEMO: Diet and metformin controlled.', now(), now()),

    -- Emily Rodriguez (2)
    ('cd000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000003', 'Acute Appendicitis with localized peritonitis', 'K35.80', 'resolved', CURRENT_DATE - 25, CURRENT_DATE - 20, 'Emergency Surgical Pathology', 'DEMO: Surgical pathology confirmed acute suppurative appendicitis.', now(), now()),
    ('cd000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000003', 'Mild Intermittent Asthma', 'J45.20', 'active', '2010-05-12', NULL, 'Pediatric Allergy History', 'DEMO: Rare exacerbations, uses albuterol rescue inhaler.', now(), now()),

    -- James Williams (4)
    ('cd000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000004', 'Cerebral Infarction due to Thrombosis of Middle Cerebral Artery', 'I63.9', 'active', CURRENT_DATE - 55, NULL, 'Stroke Team Neurovascular Note', 'DEMO: Right MCA territory ischemic stroke, residual left upper extremity weakness.', now(), now()),
    ('cd000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000004', 'Chronic Non-Valvular Atrial Fibrillation', 'I48.0', 'active', '2017-08-14', NULL, 'Electrophysiology Cardiology', 'DEMO: CHA2DS2-VASc score = 4. Anticoagulated with Apixaban.', now(), now()),
    ('cd000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000004', 'Occlusion and Stenosis of Right Internal Carotid Artery', 'I65.21', 'active', CURRENT_DATE - 55, NULL, 'CTA Head and Neck', 'DEMO: 65% NASCET stenosis of right cervical ICA.', now(), now()),
    ('cd000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000004', 'Chronic Kidney Disease, Stage 3a', 'N18.31', 'active', '2020-02-19', NULL, 'Nephrology Consult', 'DEMO: Baseline eGFR 52 mL/min/1.73m2. Monitor contrast dosage.', now(), now()),

    -- Aisha Patel (3)
    ('cd000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000005', 'Systemic Lupus Erythematosus', 'M32.9', 'active', '2021-03-10', NULL, 'Rheumatology Clinical Center', 'DEMO: ANA positive (1:640), anti-dsDNA positive, hypocomplementemia.', now(), now()),
    ('cd000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000005', 'Lupus Nephritis, ISN/RPS Class II (Mesangial Proliferative)', 'M32.14', 'active', '2023-07-22', NULL, 'Renal Biopsy Pathology', 'DEMO: Low-grade proteinuria, mesangial deposits on electron microscopy.', now(), now()),
    ('cd000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000005', 'Secondary Raynaud Phenomenon', 'I73.00', 'active', '2020-11-01', NULL, 'Vascular Outpatient Clinic', 'DEMO: Cold-induced digital blanching and cyanosis.', now(), now())
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 9. allergies (8 Total: 1-3 per patient)
-- -----------------------------------------------------------------------------
INSERT INTO public.allergies (id, patient_id, allergen, allergy_type, severity, reaction, status, source, notes, created_at, updated_at)
VALUES
    -- Sarah Johnson (2)
    ('a1000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Penicillin V Potassium', 'Drug Allergy', 'Severe', 'Anaphylactoid reaction, facial angioedema and diffuse hives', 'active', 'Hospital Inpatient Records', 'DEMO: Avoid all beta-lactam antibiotics.', now(), now()),
    ('a1000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Gadolinium-Based Contrast Agents', 'Drug Allergy', 'Mild', 'Mild erythematous macular rash, pruritus without respiratory compromise', 'active', 'Radiology Screening Note', 'DEMO: Pre-medicate with antihistamine prior to contrast MRI if mandatory.', now(), now()),

    -- Michael Chen (1)
    ('a1000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'Sulfamethoxazole / Trimethoprim (Bactrim)', 'Drug Allergy', 'Moderate', 'Extensive morbilliform eruption on trunk and extremities', 'active', 'Outpatient EHR', 'DEMO: Avoid sulfonamides.', now(), now()),

    -- Emily Rodriguez (2)
    ('a1000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003', 'Amoxicillin Trihydrate', 'Drug Allergy', 'Severe', 'Severe bronchospasm, dyspnea and perioral swelling', 'active', 'ED Medical Triage', 'DEMO: Strict contraindication for aminopenicillins.', now(), now()),
    ('a1000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000003', 'Natural Rubber Latex', 'Contact Allergy', 'Moderate', 'Contact dermatitis, erythema and localized blistering', 'active', 'Surgical Pre-op Screening', 'DEMO: Latex-free surgical suite protocol mandatory.', now(), now()),

    -- James Williams (1)
    ('a1000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000004', 'Aspirin (Acetylsalicylic Acid)', 'Drug Intolerance', 'Moderate', 'Severe epigastric pain, erosive gastritis with hematemesis', 'active', 'GI Endoscopy Report', 'DEMO: Anticoagulate with non-aspirin direct oral agents.', now(), now()),

    -- Aisha Patel (2)
    ('a1000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000005', 'Ibuprofen and Non-Steroidal Anti-Inflammatories (NSAIDs)', 'Drug Allergy', 'Severe', 'Bronchoconstriction and generalized urticaria', 'active', 'Rheumatology Clinic', 'DEMO: Avoid all COX-1/COX-2 inhibitors.', now(), now()),
    ('a1000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000005', 'Ciprofloxacin HCl', 'Drug Allergy', 'Moderate', 'Bilateral Achilles tendinopathy, nausea and dizziness', 'active', 'Outpatient Clinic', 'DEMO: Avoid fluoroquinolones.', now(), now())
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 10. medications (16 Total: 2-5 per patient)
-- -----------------------------------------------------------------------------
INSERT INTO public.medications (id, patient_id, medication_name, medication_code, dosage, frequency, route, start_date, end_date, status, source, notes, created_at, updated_at)
VALUES
    -- Sarah Johnson (3)
    ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Glatiramer Acetate (Copaxone)', '284797', '20 mg/mL', 'Once daily', 'Subcutaneous', '2025-07-01', NULL, 'active', 'Neurology Clinic', 'DEMO: First-line disease modifying therapy for RRMS.', now(), now()),
    ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Lisinopril', '29046', '10 mg', 'Once daily', 'Oral', '2021-09-15', NULL, 'active', 'Primary Care', 'DEMO: Blood pressure control.', now(), now()),
    ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Sumatriptan Succinate', '102921', '50 mg', 'PRN at migraine onset', 'Oral', '2019-01-10', NULL, 'active', 'Neurology Clinic', 'DEMO: Max 200 mg / 24 hours.', now(), now()),

    -- Michael Chen (4)
    ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'Tiotropium Bromide (Spiriva HandiHaler)', '358263', '18 mcg capsule', 'Once daily', 'Inhalation', '2022-05-01', NULL, 'active', 'Pulmonology Outpatient', 'DEMO: Long-acting muscarinic antagonist.', now(), now()),
    ('40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', 'Metformin Hydrochloride', '6809', '500 mg', 'Twice daily with meals', 'Oral', '2016-02-01', NULL, 'active', 'Endocrinology Records', 'DEMO: Type 2 diabetes control.', now(), now()),
    ('40000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', 'Atorvastatin Calcium', '83367', '40 mg', 'Once daily at bedtime', 'Oral', '2019-11-10', NULL, 'active', 'Cardiology Clinic', 'DEMO: High-intensity statin therapy.', now(), now()),
    ('40000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', 'Budesonide / Formoterol (Symbicort)', '351401', '160/4.5 mcg', '2 puffs twice daily', 'Inhalation', '2022-05-01', NULL, 'active', 'Pulmonology Outpatient', 'DEMO: Combined ICS / LABA maintenance.', now(), now()),

    -- Emily Rodriguez (2)
    ('40000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000003', 'Albuterol Sulfate Inhalation Aerosol (ProAir)', '745679', '90 mcg/actuation', '1-2 puffs every 4-6 hrs PRN wheezing', 'Inhalation', '2015-08-10', NULL, 'active', 'Allergy Clinic', 'DEMO: Rescue short-acting bronchodilator.', now(), now()),
    ('40000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000003', 'Acetaminophen', '161', '500 mg', 'Every 6 hrs PRN mild post-op pain', 'Oral', CURRENT_DATE - 24, CURRENT_DATE - 10, 'completed', 'Surgical Discharge', 'DEMO: Short-course post-appendectomy pain control.', now(), now()),

    -- James Williams (4)
    ('40000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000004', 'Apixaban (Eliquis)', '1364430', '5 mg', 'Twice daily', 'Oral', CURRENT_DATE - 53, NULL, 'active', 'Stroke Inpatient Service', 'DEMO: Direct oral anticoagulant for stroke prevention in AFib.', now(), now()),
    ('40000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000004', 'Metoprolol Succinate ER', '866436', '50 mg', 'Once daily', 'Oral', '2017-09-01', NULL, 'active', 'Cardiology Outpatient', 'DEMO: Ventricular rate control in AFib.', now(), now()),
    ('40000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000004', 'Rosuvastatin Calcium', '309362', '20 mg', 'Once daily at bedtime', 'Oral', CURRENT_DATE - 50, NULL, 'active', 'Stroke Service', 'DEMO: Intensive plaque stabilization.', now(), now()),
    ('40000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000004', 'Losartan Potassium', '52246', '50 mg', 'Once daily', 'Oral', '2020-03-15', NULL, 'active', 'Nephrology Clinic', 'DEMO: Renoprotection and blood pressure control.', now(), now()),

    -- Aisha Patel (3)
    ('40000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000005', 'Hydroxychloroquine Sulfate (Plaquenil)', '5521', '200 mg', 'Once daily with meal', 'Oral', '2021-04-01', NULL, 'active', 'Rheumatology Center', 'DEMO: Cornerstone SLE background therapy. Annual ophthalmology exams up to date.', now(), now()),
    ('40000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000005', 'Prednisone', '8640', '10 mg', 'Once daily in the morning', 'Oral', CURRENT_DATE - 38, NULL, 'active', 'Rheumatology Center', 'DEMO: Tapering dose for lupus pleuritis flare.', now(), now()),
    ('40000000-0000-0000-0000-000000000016', '20000000-0000-0000-0000-000000000005', 'Mycophenolate Mofetil (CellCept)', '68149', '1000 mg', 'Twice daily on empty stomach', 'Oral', '2023-08-01', NULL, 'active', 'Nephrology Outpatient', 'DEMO: Maintenance therapy for Class II lupus nephritis.', now(), now())
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 11. medication_orders (5 Prescriptions)
-- -----------------------------------------------------------------------------
INSERT INTO public.medication_orders (id, patient_id, encounter_id, doctor_id, medication_name, dosage, frequency, route, duration, instructions, order_status, created_at, updated_at)
VALUES
    ('4a000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Glatiramer Acetate', '20 mg/mL', 'Daily', 'Subcutaneous', '12 months', 'Inject 20 mg subcutaneously once daily using auto-injector; rotate injection sites.', 'active', now() - interval '68 days', now() - interval '68 days'),
    ('4a000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000002', 'Tiotropium Bromide', '18 mcg', 'Once daily', 'Inhalation', '6 months', 'Inhale contents of one capsule daily using HandiHaler device.', 'active', now() - interval '64 days', now() - interval '64 days'),
    ('4a000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000001', 'Cefazolin Sodium', '2 g', 'Single dose', 'Intravenous', 'Single dose', 'Administer IV 30-60 minutes prior to surgical skin incision.', 'completed', now() - interval '25 days', now() - interval '25 days'),
    ('4a000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000001', 'Apixaban', '5 mg', 'Twice daily', 'Oral', 'Ongoing', 'Take 5 mg by mouth twice daily with or without food. Monitor renal function every 6 months.', 'active', now() - interval '53 days', now() - interval '53 days'),
    ('4a000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000002', 'Prednisone', '10 mg', 'Once daily', 'Oral', '4 weeks', 'Take with breakfast. Taper down by 2.5 mg every two weeks following clinical re-evaluation.', 'active', now() - interval '38 days', now() - interval '38 days')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 12. medical_files (5 Diagnostic Attachments)
-- -----------------------------------------------------------------------------
INSERT INTO public.medical_files (id, patient_id, encounter_id, uploaded_by, original_filename, storage_path, file_type, mime_type, file_size, document_category, processing_status, upload_timestamp, metadata, created_at)
VALUES
    (
        'f0000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000001',
        'e0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002',
        'MRI_Brain_3T_T1_T2_FLAIR_Axial.dcm',
        '20000000-0000-0000-0000-000000000001/mri_brain_3t_t1_t2_flair.dcm',
        'DICOM',
        'application/dicom',
        42598400,
        'Radiology Scan',
        'completed',
        now() - interval '72 days',
        '{"modality":"MR","body_part":"HEAD","scanner":"Siemens Skyra 3T","sequences":["T1_SE","T2_TSE","3D_FLAIR","DWI"]}'::jsonb,
        now() - interval '72 days'
    ),
    (
        'f0000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000002',
        'e0000000-0000-0000-0000-000000000005',
        '10000000-0000-0000-0000-000000000003',
        'HRCT_Chest_Inspiration_ThinSlice.pdf',
        '20000000-0000-0000-0000-000000000002/hrct_chest_report.pdf',
        'PDF',
        'application/pdf',
        2104500,
        'Radiology Report',
        'completed',
        now() - interval '67 days',
        '{"modality":"CT","body_part":"CHEST","kvp":120,"slice_thickness_mm":1.0,"contrast":false}'::jsonb,
        now() - interval '67 days'
    ),
    (
        'f0000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000003',
        'e0000000-0000-0000-0000-000000000007',
        '10000000-0000-0000-0000-000000000002',
        'US_Abdomen_RLQ_Graded_Compression.pdf',
        '20000000-0000-0000-0000-000000000003/us_appendix_study.pdf',
        'PDF',
        'application/pdf',
        1450200,
        'Ultrasound Report',
        'completed',
        now() - interval '25 days',
        '{"modality":"US","probe":"Linear 12-5 MHz","target":"Appendix"}'::jsonb,
        now() - interval '25 days'
    ),
    (
        'f0000000-0000-0000-0000-000000000004',
        '20000000-0000-0000-0000-000000000004',
        'e0000000-0000-0000-0000-000000000009',
        '10000000-0000-0000-0000-000000000002',
        'CTA_Head_and_Neck_Angiography.pdf',
        '20000000-0000-0000-0000-000000000004/cta_neurovascular_study.pdf',
        'PDF',
        'application/pdf',
        3890100,
        'Angiography Report',
        'completed',
        now() - interval '55 days',
        '{"modality":"CTA","contrast_agent":"Isovue-370","vessels":["Carotid","Circle_of_Willis"]}'::jsonb,
        now() - interval '55 days'
    ),
    (
        'f0000000-0000-0000-0000-000000000005',
        '20000000-0000-0000-0000-000000000005',
        'e0000000-0000-0000-0000-000000000011',
        '10000000-0000-0000-0000-000000000003',
        'CXR_PA_Lateral_and_Renal_Ultrasound.pdf',
        '20000000-0000-0000-0000-000000000005/cxr_renal_us_multimodal.pdf',
        'PDF',
        'application/pdf',
        2780000,
        'Multi-modal Report',
        'completed',
        now() - interval '40 days',
        '{"modality":["CR","US"],"clinical_indication":"Lupus pleuritis and renal parenchymal baseline"}'::jsonb,
        now() - interval '40 days'
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 13. lab_results (25 Total: 4-6 per patient)
-- -----------------------------------------------------------------------------
INSERT INTO public.lab_results (id, patient_id, encounter_id, test_name, test_code, value, unit, reference_range, abnormal_flag, specimen, result_date, source_file_id, notes, created_at, updated_at)
VALUES
    -- Sarah Johnson (5)
    ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'CSF Oligoclonal Bands', '24108-3', 'Positive (>4 unique bands)', 'bands', 'Negative (<2 bands)', 'HIGH', 'Cerebrospinal Fluid', CURRENT_DATE - 84, 'f0000000-0000-0000-0000-000000000001', 'DEMO: Isoelectric focusing confirms intrathecal IgG synthesis.', now(), now()),
    ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'CSF IgG Index', '14115-0', '0.88', 'ratio', '0.28 - 0.66', 'HIGH', 'Cerebrospinal Fluid', CURRENT_DATE - 84, 'f0000000-0000-0000-0000-000000000001', 'DEMO: Elevated intrathecal IgG production.', now(), now()),
    ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Serum Neurofilament Light Chain (sNfL)', '98721-4', '18.4', 'pg/mL', '< 12.0', 'HIGH', 'Serum', CURRENT_DATE - 84, NULL, 'DEMO: Active neuro-axonal damage marker.', now(), now()),
    ('50000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', '25-Hydroxy Vitamin D', '1989-3', '21.0', 'ng/mL', '30.0 - 100.0', 'LOW', 'Serum', CURRENT_DATE - 70, NULL, 'DEMO: Insufficiency; oral cholecalciferol supplementation advised.', now(), now()),
    ('50000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'Complete Blood Count: White Blood Cells', '6690-2', '6.8', 'x10^3/uL', '4.5 - 11.0', 'NORMAL', 'Whole Blood', CURRENT_DATE - 10, NULL, 'DEMO: Normal baseline hematology.', now(), now()),

    -- Michael Chen (5)
    ('50000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000004', 'Spirometry FEV1 Post-Bronchodilator', '19926-5', '1.85', 'Liters', '2.98 (pred)', 'LOW', 'Respiratory Expiratory', CURRENT_DATE - 114, 'f0000000-0000-0000-0000-000000000002', 'DEMO: 62% of predicted value, indicating moderate airway obstruction.', now(), now()),
    ('50000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000004', 'Spirometry FEV1 / FVC Ratio', '19970-3', '0.58', 'fraction', '> 0.70', 'LOW', 'Respiratory Expiratory', CURRENT_DATE - 114, 'f0000000-0000-0000-0000-000000000002', 'DEMO: Fixed airflow obstruction diagnostic of COPD.', now(), now()),
    ('50000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000004', 'Hemoglobin A1c', '4548-4', '7.4', '%', '< 5.7', 'HIGH', 'Whole Blood', CURRENT_DATE - 114, NULL, 'DEMO: Suboptimal diabetic glycation.', now(), now()),
    ('50000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005', 'High-Sensitivity Troponin I', '89579-7', '7.8', 'pg/mL', '< 14.0', 'NORMAL', 'Plasma', CURRENT_DATE - 65, NULL, 'DEMO: Myocardial necrosis ruled out.', now(), now()),
    ('50000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000006', 'Arterial Blood Gas: PaO2 (Room Air)', '2703-7', '74.0', 'mmHg', '80.0 - 100.0', 'LOW', 'Arterial Blood', CURRENT_DATE - 15, NULL, 'DEMO: Mild resting hypoxemia.', now(), now()),

    -- Emily Rodriguez (4)
    ('50000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000007', 'White Blood Cell Count (WBC)', '6690-2', '14.8', 'x10^3/uL', '4.5 - 11.0', 'HIGH', 'Whole Blood', CURRENT_DATE - 25, 'f0000000-0000-0000-0000-000000000003', 'DEMO: Marked leukocytosis with 84% neutrophils (left shift).', now(), now()),
    ('50000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000007', 'C-Reactive Protein (CRP), High Sensitivity', '1988-5', '46.2', 'mg/L', '< 5.0', 'HIGH', 'Serum', CURRENT_DATE - 25, 'f0000000-0000-0000-0000-000000000003', 'DEMO: Severe acute inflammatory elevation.', now(), now()),
    ('50000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000007', 'Human Chorionic Gonadotropin (Beta-hCG), Qualitative', '2118-8', 'Negative', 'qualitative', 'Negative', 'NORMAL', 'Urine', CURRENT_DATE - 25, NULL, 'DEMO: Ectopic pregnancy ruled out.', now(), now()),
    ('50000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000008', 'White Blood Cell Count (Post-op Check)', '6690-2', '6.2', 'x10^3/uL', '4.5 - 11.0', 'NORMAL', 'Whole Blood', CURRENT_DATE - 8, NULL, 'DEMO: Leukocytosis fully resolved post-appendectomy.', now(), now()),

    -- James Williams (5)
    ('50000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000009', 'Serum Creatinine', '2160-0', '1.48', 'mg/dL', '0.70 - 1.30', 'HIGH', 'Serum', CURRENT_DATE - 55, 'f0000000-0000-0000-0000-000000000004', 'DEMO: Baseline CKD Stage 3a.', now(), now()),
    ('50000000-0000-0000-0000-000000000016', '20000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000009', 'Estimated Glomerular Filtration Rate (eGFR)', '33914-3', '51.0', 'mL/min/1.73m2', '> 60.0', 'LOW', 'Serum', CURRENT_DATE - 55, 'f0000000-0000-0000-0000-000000000004', 'DEMO: Moderate renal impairment; adjusted contrast bolus utilized.', now(), now()),
    ('50000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000009', 'Prothrombin Time / International Normalized Ratio (INR)', '6301-6', '1.1', 'INR', '0.8 - 1.2', 'NORMAL', 'Platelet Poor Plasma', CURRENT_DATE - 55, NULL, 'DEMO: Non-anticoagulated baseline prior to Eliquis initiation.', now(), now()),
    ('50000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000009', 'N-Terminal Pro-B-Type Natriuretic Peptide (NT-proBNP)', '33762-6', '512.0', 'pg/mL', '< 125.0', 'HIGH', 'Serum', CURRENT_DATE - 55, NULL, 'DEMO: Neurohormonal cardiac wall stress secondary to chronic atrial fibrillation.', now(), now()),
    ('50000000-0000-0000-0000-000000000019', '20000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000010', 'Lipid Panel: Low-Density Lipoprotein (LDL)', '13457-7', '68.0', 'mg/dL', '< 70.0 (very high risk)', 'NORMAL', 'Serum', CURRENT_DATE - 12, NULL, 'DEMO: Target post-stroke lipid level attained on Rosuvastatin 20 mg.', now(), now()),

    -- Aisha Patel (6)
    ('50000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000011', 'Antinuclear Antibodies (ANA) Screen by IFA', '8061-4', 'Positive (1:640, Homogeneous)', 'titer', '< 1:40', 'HIGH', 'Serum', CURRENT_DATE - 40, 'f0000000-0000-0000-0000-000000000005', 'DEMO: Strongly positive antinuclear antibody titer.', now(), now()),
    ('50000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000011', 'Anti-Double-Stranded DNA (Anti-dsDNA)', '5130-0', '88.0', 'IU/mL', '< 10.0', 'HIGH', 'Serum', CURRENT_DATE - 40, 'f0000000-0000-0000-0000-000000000005', 'DEMO: High titer diagnostic of active SLE flare.', now(), now()),
    ('50000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000011', 'Complement C3', '4485-9', '58.0', 'mg/dL', '90.0 - 180.0', 'LOW', 'Serum', CURRENT_DATE - 40, 'f0000000-0000-0000-0000-000000000005', 'DEMO: Hypocomplementemia reflecting active immune complex consumption.', now(), now()),
    ('50000000-0000-0000-0000-000000000023', '20000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000011', 'Complement C4', '4498-2', '8.2', 'mg/dL', '16.0 - 47.0', 'LOW', 'Serum', CURRENT_DATE - 40, 'f0000000-0000-0000-0000-000000000005', 'DEMO: Severe classical complement pathway consumption.', now(), now()),
    ('50000000-0000-0000-0000-000000000024', '20000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000011', '24-Hour Urine Protein Excretion', '2889-4', '440.0', 'mg/24hr', '< 150.0', 'HIGH', '24h Urine', CURRENT_DATE - 39, NULL, 'DEMO: Mild sub-nephrotic proteinuria consistent with Class II lupus nephritis.', now(), now()),
    ('50000000-0000-0000-0000-000000000025', '20000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000012', 'Serum Albumin', '1751-7', '3.8', 'g/dL', '3.5 - 5.0', 'NORMAL', 'Serum', CURRENT_DATE - 5, NULL, 'DEMO: Intact hepatic synthesis, no severe hypoalbuminemia.', now(), now())
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 14. clinical_notes (5 Narrative Physician Notes)
-- -----------------------------------------------------------------------------
INSERT INTO public.clinical_notes (id, patient_id, encounter_id, doctor_id, note_type, content, structured_content, source, status, created_at, updated_at)
VALUES
    (
        'c0000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000001',
        'e0000000-0000-0000-0000-000000000002',
        'd0000000-0000-0000-0000-000000000001',
        'Diagnostic Consultation & Radiology Integration Note',
        'PATIENT: Sarah Johnson (PT-10021). DEMO RECORD.
SUBJECTIVE: 44-year-old female presents for post-imaging consultation regarding recurrent visual obscuration and lower extremity sensory ataxia.
OBJECTIVE: 3T Brain MRI with 3D FLAIR and T1-weighted sequences demonstrates 14 distinct periventricular and juxtacortical hyperintense demyelinating lesions oriented perpendicular to lateral ventricles (Dawson fingers). CSF positive for >4 unique oligoclonal bands.
ASSESSMENT: Relapsing-Remitting Multiple Sclerosis (ICD-10 G35), satisfying 2017 McDonald Criteria for dissemination in space (DIS) and dissemination in time (DIT).
PLAN: Initiated Glatiramer acetate (Copaxone) 20 mg SQ daily. Routine surveillance MRI scheduled at 6 months.',
        '{"edss_score": 1.5, "mcdonald_criteria_met": true, "dissemination_in_space": true, "dissemination_in_time": true, "prescribed_dmt": "Glatiramer Acetate"}'::jsonb,
        'Neurology Clinic EMR',
        'final',
        now() - interval '69 days',
        now() - interval '69 days'
    ),
    (
        'c0000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000002',
        'e0000000-0000-0000-0000-000000000005',
        'd0000000-0000-0000-0000-000000000002',
        'Pulmonology & Thoracic CT Imaging Review',
        'PATIENT: Michael Chen (PT-10045). DEMO RECORD.
SUBJECTIVE: 57-year-old male with 40 pack-year smoking history evaluated for exertional shortness of breath and cough.
OBJECTIVE: HRCT of the chest reveals a 6.2 mm non-calcified solid solitary pulmonary nodule located in the right upper lobe apical segment. Upper-lobe predominant centrilobular emphysematous destruction noted. Spirometry FEV1/FVC = 0.58.
ASSESSMENT:
1. Solitary Pulmonary Nodule, Lung-RADS Category 3 (Probably Benign). Per Fleischner Society 2017/2024 guidelines for solid nodules 6-8 mm in high-risk patients, follow-up low-dose CT is recommended in 6 to 12 months.
2. COPD, GOLD Stage II (Moderate).
PLAN: Continue Tiotropium HandiHaler 18 mcg daily. Ordered low-dose surveillance Chest CT in 6 months.',
        '{"lung_rads": "Category 3", "nodule_size_mm": 6.2, "nodule_location": "RUL apical segment", "fleischner_recommendation": "Follow-up LDCT in 6-12 months", "emphysema_severity": "Moderate centrilobular"}'::jsonb,
        'Thoracic Center EMR',
        'final',
        now() - interval '64 days',
        now() - interval '64 days'
    ),
    (
        'c0000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000003',
        'e0000000-0000-0000-0000-000000000007',
        'd0000000-0000-0000-0000-000000000001',
        'Emergency Surgical Triage & Ultrasound Narrative',
        'PATIENT: Emily Rodriguez (PT-10089). DEMO RECORD.
SUBJECTIVE: 31-year-old female presents with 18 hours of migratory right lower quadrant abdominal pain, nausea, and anorexia.
OBJECTIVE: Graded compression ultrasound demonstrates a non-compressible, aperistaltic, blind-ending tubular structure in the right lower quadrant measuring 8.8 mm in maximal outer diameter, with surrounding hyperechoic mesenteric fat stranding and an obstructing appendicolith.
ASSESSMENT: Acute appendicitis with localized inflammatory peritonitis. Alvarado Score: 8/10 (High Probability).
PLAN: Immediate surgical consultation obtained. Patient placed NPO, intravenous fluids and preoperative Cefazolin administered, scheduled for laparoscopic appendectomy.',
        '{"ultrasound_findings": {"diameter_mm": 8.8, "compressible": false, "appendicolith_present": true, "fat_stranding": true}, "alvarado_score": 8, "management": "Urgent Appendectomy"}'::jsonb,
        'Emergency Department Records',
        'final',
        now() - interval '25 days',
        now() - interval '25 days'
    ),
    (
        'c0000000-0000-0000-0000-000000000004',
        '20000000-0000-0000-0000-000000000004',
        'e0000000-0000-0000-0000-000000000009',
        'd0000000-0000-0000-0000-000000000001',
        'Comprehensive Neurovascular Stroke Assessment',
        'PATIENT: James Williams (PT-10112). DEMO RECORD.
SUBJECTIVE: 71-year-old male with persistent atrial fibrillation presented with sudden-onset left facial droop and left arm hemiparesis.
OBJECTIVE: Non-contrast Head CT demonstrates early subtle hypoattenuation in the right insular ribbon (ASPECTS score 8/10), no intracranial hemorrhage. CTA head and neck demonstrates a right internal carotid artery proximal bulb stenosis calculated at 65% by NASCET criteria and distal M2 branch oligemia.
ASSESSMENT: Acute ischemic cerebrovascular accident in right middle cerebral artery distribution, secondary to cardioembolism and concomitant severe carotid atherosclerosis.
PLAN: Admitted to Neuro-ICU. Full anticoagulation initiated with Apixaban 5 mg BID for stroke recurrence prevention in AFib. High-potency statin therapy (Rosuvastatin 20 mg) started.',
        '{"aspects_score": 8, "stroke_etiology": "Cardioembolic + Atherosclerotic", "nascet_stenosis_percent": 65, "nihss_admission": 4, "anticoagulation": "Apixaban"}'::jsonb,
        'Stroke Team Neuro-ICU Note',
        'final',
        now() - interval '54 days',
        now() - interval '54 days'
    ),
    (
        'c0000000-0000-0000-0000-000000000005',
        '20000000-0000-0000-0000-000000000005',
        'e0000000-0000-0000-0000-000000000011',
        'd0000000-0000-0000-0000-000000000002',
        'Rheumatology & Thoracic Multi-Disciplinary Encounter',
        'PATIENT: Aisha Patel (PT-10164). DEMO RECORD.
SUBJECTIVE: 35-year-old female with SLE presents with left-sided pleuritic chest discomfort, mild dyspnea, and wrist synovitis.
OBJECTIVE: Chest radiograph shows blunting of the left costophrenic angle consistent with a small non-loculated pleural effusion. Renal ultrasound reveals preserved parenchymal thickness (11.4 cm bilateral) with mild diffuse cortical hyperechogenicity. Labs: Anti-dsDNA 88 IU/mL, C3 58 mg/dL, C4 8.2 mg/dL.
ASSESSMENT: Acute SLE flare manifested by serositis (lupus pleuritis) and active serological consumption in the setting of quiescent Class II lupus nephritis.
PLAN: Initiate Prednisone 10 mg daily taper. Continue baseline Hydroxychloroquine 200 mg daily and Mycophenolate Mofetil 1000 mg BID. Re-evaluate pleuritic symptoms in 4 weeks.',
        '{"sle_manifestations": ["Lupus pleuritis", "Malar rash", "Hypocomplementemia", "Active dsDNA"], "pleural_effusion": "Small left-sided", "adjusted_steroids": "Prednisone 10mg daily"}'::jsonb,
        'Rheumatology Center',
        'final',
        now() - interval '39 days',
        now() - interval '39 days'
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 15. ai_workflows (5 AI Clinical Pipelines)
-- -----------------------------------------------------------------------------
INSERT INTO public.ai_workflows (id, patient_id, encounter_id, initiated_by, workflow_type, workflow_status, workflow_config, started_at, completed_at, error_message, created_at, updated_at)
VALUES
    (
        '60000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000001',
        'e0000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000002',
        'neuro_mri_demyelinating_eval',
        'completed',
        '{"pipeline": ["dicom_ingestion", "3d_flair_segmentation", "mcdonald_criteria_evaluator", "cdss_report_generator"], "model": "med-gemini-vision-pro", "target_disease": "Multiple Sclerosis"}'::jsonb,
        now() - interval '71 days 10 hours',
        now() - interval '71 days 9 hours',
        NULL,
        now() - interval '71 days 10 hours',
        now() - interval '71 days 9 hours'
    ),
    (
        '60000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000002',
        'e0000000-0000-0000-0000-000000000005',
        '10000000-0000-0000-0000-000000000003',
        'thoracic_ct_nodule_and_copd_eval',
        'completed',
        '{"pipeline": ["ct_volumetric_analysis", "pulmonary_nodule_detector", "fleischner_criteria_matcher", "emphysema_index_calculator"], "model": "med-gemini-vision-pro"}'::jsonb,
        now() - interval '66 days 14 hours',
        now() - interval '66 days 13 hours',
        NULL,
        now() - interval '66 days 14 hours',
        now() - interval '66 days 13 hours'
    ),
    (
        '60000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000003',
        'e0000000-0000-0000-0000-000000000007',
        '10000000-0000-0000-0000-000000000002',
        'emergency_rlq_ultrasound_eval',
        'completed',
        '{"pipeline": ["ultrasound_feature_extractor", "appendix_caliper_measurement", "alvarado_risk_engine"], "model": "med-gemini-emergency-v1"}'::jsonb,
        now() - interval '25 days 2 hours',
        now() - interval '25 days 1 hour',
        NULL,
        now() - interval '25 days 2 hours',
        now() - interval '25 days 1 hour'
    ),
    (
        '60000000-0000-0000-0000-000000000004',
        '20000000-0000-0000-0000-000000000004',
        'e0000000-0000-0000-0000-000000000009',
        '10000000-0000-0000-0000-000000000002',
        'acute_stroke_ct_cta_eval',
        'completed',
        '{"pipeline": ["ncct_aspects_scorer", "cta_vessel_occlusion_detector", "ischemic_penumbra_estimator"], "model": "neuro-cta-fast-v2"}'::jsonb,
        now() - interval '55 days 1 hour',
        now() - interval '55 days',
        NULL,
        now() - interval '55 days 1 hour',
        now() - interval '55 days'
    ),
    (
        '60000000-0000-0000-0000-000000000005',
        '20000000-0000-0000-0000-000000000005',
        'e0000000-0000-0000-0000-000000000011',
        '10000000-0000-0000-0000-000000000003',
        'multi_organ_autoimmune_eval',
        'completed',
        '{"pipeline": ["cxr_pleural_segmenter", "renal_ultrasound_cortical_evaluator", "sle_activity_index_calculator"], "model": "rheum-cdss-v1"}'::jsonb,
        now() - interval '40 days 3 hours',
        now() - interval '40 days 2 hours',
        NULL,
        now() - interval '40 days 3 hours',
        now() - interval '40 days 2 hours'
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 16. agent_runs (10 Executions: 2 per workflow)
-- -----------------------------------------------------------------------------
INSERT INTO public.agent_runs (id, workflow_id, patient_id, encounter_id, agent_name, model_name, execution_status, input_summary, output_data, error_message, execution_time_ms, started_at, completed_at, created_at)
VALUES
    -- Workflow 1 (Sarah Johnson - Neuro MS)
    (
        '70000000-0000-0000-0000-000000000001',
        '60000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000001',
        'e0000000-0000-0000-0000-000000000002',
        'NeuroVisionSegmenterAgent',
        'med-gemini-vision-pro',
        'completed',
        '{"target_scan": "mri_brain_3t_t1_t2_flair.dcm", "sequences": ["FLAIR", "T1", "T2"]}'::jsonb,
        '{"total_lesion_count": 14, "periventricular_lesions": 8, "juxtacortical_lesions": 4, "infratentorial_lesions": 2, "dawson_fingers_detected": true, "total_lesion_volume_cm3": 8.42}'::jsonb,
        NULL,
        14250,
        now() - interval '71 days 10 hours',
        now() - interval '71 days 10 hours' + interval '15 seconds',
        now() - interval '71 days 10 hours'
    ),
    (
        '70000000-0000-0000-0000-000000000002',
        '60000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000001',
        'e0000000-0000-0000-0000-000000000002',
        'McDonaldCriteriaAdvisorAgent',
        'med-gemini-reasoning-pro',
        'completed',
        '{"segmentation_run_id": "r0000000-0000-0000-0000-000000000001", "csf_oligoclonal_bands": "positive"}'::jsonb,
        '{"diagnosis": "Relapsing-Remitting Multiple Sclerosis", "dissemination_in_space_satisfied": true, "dissemination_in_time_satisfied": true, "evidence_summary": "Intrathecal oligoclonal bands substitute for dissemination in time under McDonald 2017 criteria.", "recommended_next_step": "Initiate first-line disease modifying therapy (e.g., Glatiramer acetate or Dimethyl fumarate)"}'::jsonb,
        NULL,
        6820,
        now() - interval '71 days 10 hours' + interval '16 seconds',
        now() - interval '71 days 10 hours' + interval '23 seconds',
        now() - interval '71 days 10 hours'
    ),

    -- Workflow 2 (Michael Chen - Pulmonary Nodule)
    (
        '70000000-0000-0000-0000-000000000003',
        '60000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000002',
        'e0000000-0000-0000-0000-000000000005',
        'ThoracicNoduleDetectorAgent',
        'med-gemini-vision-pro',
        'completed',
        '{"ct_scan": "HRCT_Chest_Inspiration_ThinSlice.pdf", "slice_count": 280}'::jsonb,
        '{"detected_nodules": [{"id": 1, "lobe": "Right Upper Lobe", "segment": "Apical", "diameter_axial_mm": 6.2, "diameter_coronal_mm": 5.9, "attenuation": "Solid", "margins": "Smooth", "calcification": false}], "emphysema_score_percent": 18.4}'::jsonb,
        NULL,
        18900,
        now() - interval '66 days 14 hours',
        now() - interval '66 days 14 hours' + interval '19 seconds',
        now() - interval '66 days 14 hours'
    ),
    (
        '70000000-0000-0000-0000-000000000004',
        '60000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000002',
        'e0000000-0000-0000-0000-000000000005',
        'FleischnerGuidelineMatcherAgent',
        'med-gemini-reasoning-pro',
        'completed',
        '{"nodule_size_mm": 6.2, "patient_risk_category": "High (40 pack-year smoker)", "nodule_type": "Solid Solitary"}'::jsonb,
        '{"guideline_reference": "Fleischner Society Guidelines 2017/2024", "category": "Lung-RADS 3 (Probably Benign)", "malignancy_risk_percent": 2.1, "recommendation": "Surveillance low-dose CT chest in 6 to 12 months. Routine biopsy not indicated at current caliber."}'::jsonb,
        NULL,
        4150,
        now() - interval '66 days 14 hours' + interval '20 seconds',
        now() - interval '66 days 14 hours' + interval '24 seconds',
        now() - interval '66 days 14 hours'
    ),

    -- Workflow 3 (Emily Rodriguez - Appendicitis)
    (
        '70000000-0000-0000-0000-000000000005',
        '60000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000003',
        'e0000000-0000-0000-0000-000000000007',
        'UltrasoundFeatureExtractorAgent',
        'med-gemini-vision-pro',
        'completed',
        '{"ultrasound_input": "US_Abdomen_RLQ_Graded_Compression.pdf"}'::jsonb,
        '{"appendix_diameter_mm": 8.8, "wall_thickness_mm": 3.4, "compressibility": false, "appendicolith": true, "periappendiceal_hyperechoic_fat": true, "free_fluid": "Trace in right paracolic gutter"}'::jsonb,
        NULL,
        7800,
        now() - interval '25 days 2 hours',
        now() - interval '25 days 2 hours' + interval '8 seconds',
        now() - interval '25 days 2 hours'
    ),
    (
        '70000000-0000-0000-0000-000000000006',
        '60000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000003',
        'e0000000-0000-0000-0000-000000000007',
        'EmergencyRiskEngineAgent',
        'med-gemini-reasoning-pro',
        'completed',
        '{"alvarado_components": {"rlq_tenderness": 2, "elevated_temp": 1, "rebound": 1, "migration": 1, "anorexia": 1, "nausea": 1, "leukocytosis": 2, "left_shift": 1}}'::jsonb,
        '{"total_alvarado_score": 10, "clinical_probability": "Very High (>95%)", "recommended_disposition": "Immediate surgical consult for operative management; withhold oral intake."}'::jsonb,
        NULL,
        3200,
        now() - interval '25 days 2 hours' + interval '9 seconds',
        now() - interval '25 days 2 hours' + interval '12 seconds',
        now() - interval '25 days 2 hours'
    ),

    -- Workflow 4 (James Williams - Stroke)
    (
        '70000000-0000-0000-0000-000000000007',
        '60000000-0000-0000-0000-000000000004',
        '20000000-0000-0000-0000-000000000004',
        'e0000000-0000-0000-0000-000000000009',
        'ASPECTSQuantifierAgent',
        'med-gemini-vision-pro',
        'completed',
        '{"scan_type": "NCCT Head", "slice_thickness_mm": 2.5}'::jsonb,
        '{"aspects_score": 8, "regions_involved": ["Right Insular Ribbon (I)", "Right Lentiform Nucleus (L)"], "intracranial_hemorrhage": false, "hyperdense_mca_sign": false}'::jsonb,
        NULL,
        9100,
        now() - interval '55 days 1 hour',
        now() - interval '55 days 1 hour' + interval '9 seconds',
        now() - interval '55 days 1 hour'
    ),
    (
        '70000000-0000-0000-0000-000000000008',
        '60000000-0000-0000-0000-000000000004',
        '20000000-0000-0000-0000-000000000009',
        'CTAStenosisAnalyzerAgent',
        'med-gemini-vision-pro',
        'completed',
        '{"cta_study": "CTA_Head_and_Neck_Angiography.pdf"}'::jsonb,
        '{"carotid_stenosis_side": "Right", "nascet_stenosis_percentage": 65.2, "plaque_morphology": "Calcified and fibrous with smooth luminal surface", "large_vessel_occlusion": false, "distal_perfusion": "Preserved via anterior communicating collaterals"}'::jsonb,
        NULL,
        11400,
        now() - interval '55 days 1 hour' + interval '10 seconds',
        now() - interval '55 days 1 hour' + interval '21 seconds',
        now() - interval '55 days 1 hour'
    ),

    -- Workflow 5 (Aisha Patel - Autoimmune)
    (
        '70000000-0000-0000-0000-000000000009',
        '60000000-0000-0000-0000-000000000005',
        '20000000-0000-0000-0000-000000000005',
        'e0000000-0000-0000-0000-000000000011',
        'ThoracicSerositisAgent',
        'med-gemini-vision-pro',
        'completed',
        '{"radiograph": "CXR_PA_Lateral_and_Renal_Ultrasound.pdf"}'::jsonb,
        '{"pleural_effusion": true, "laterality": "Left", "estimated_volume_ml": 120, "consolidation": false, "cardiomegaly": false, "diagnostic_impression": "Small non-infectious inflammatory effusion secondary to lupus serositis"}'::jsonb,
        NULL,
        6400,
        now() - interval '40 days 3 hours',
        now() - interval '40 days 3 hours' + interval '7 seconds',
        now() - interval '40 days 3 hours'
    ),
    (
        '70000000-0000-0000-0000-000000000010',
        '60000000-0000-0000-0000-000000000005',
        '20000000-0000-0000-0000-000000000005',
        'e0000000-0000-0000-0000-000000000011',
        'SLEDAITrajectoryAgent',
        'med-gemini-reasoning-pro',
        'completed',
        '{"serology": {"anti_dsdna": 88, "c3": 58, "c4": 8.2}, "clinical_features": ["pleurisy", "malar_rash"]}'::jsonb,
        '{"sledai_2k_score": 10, "disease_activity_tier": "High Disease Activity", "trajectory": "Acute flare on background controlled lupus nephritis", "recommendation": "Short-term oral steroid boost and monitoring of complement normalization in 4 weeks."}'::jsonb,
        NULL,
        4800,
        now() - interval '40 days 3 hours' + interval '8 seconds',
        now() - interval '40 days 3 hours' + interval '13 seconds',
        now() - interval '40 days 3 hours'
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 17. document_extractions (5 OCR / Vision Extractions)
-- -----------------------------------------------------------------------------
INSERT INTO public.document_extractions (id, medical_file_id, extraction_type, extracted_text, structured_data, confidence, extraction_status, error_message, agent_run_id, created_at, updated_at)
VALUES
    (
        'fa000000-0000-0000-0000-000000000001',
        'f0000000-0000-0000-0000-000000000001',
        'DICOM Header and Volumetric Extraction',
        'Study: MRI Brain 3T without contrast. Findings: Multifocal T2/FLAIR hyperintensities in corpus callosum and periventricular white matter oriented perpendicular to ventricles.',
        '{"lesion_count": 14, "largest_diameter_mm": 9.4, "locations": ["periventricular", "juxtacortical"]}'::jsonb,
        0.9850,
        'completed',
        NULL,
        '70000000-0000-0000-0000-000000000001',
        now() - interval '71 days',
        now() - interval '71 days'
    ),
    (
        'fa000000-0000-0000-0000-000000000002',
        'f0000000-0000-0000-0000-000000000002',
        'Radiology PDF OCR & Entity Parser',
        'EXAMINATION: High-Resolution CT of the Chest without IV Contrast. FINDINGS: Right upper lobe non-calcified solid nodule measuring 6.2 mm. Moderate upper lobe emphysematous changes.',
        '{"findings": [{"entity": "pulmonary nodule", "size_mm": 6.2, "lobe": "RUL"}, {"entity": "emphysema", "grade": "moderate"}]}'::jsonb,
        0.9920,
        'completed',
        NULL,
        '70000000-0000-0000-0000-000000000003',
        now() - interval '66 days',
        now() - interval '66 days'
    ),
    (
        'fa000000-0000-0000-0000-000000000003',
        'f0000000-0000-0000-0000-000000000003',
        'Ultrasound Protocol Text Parser',
        'ULTRASOUND RIGHT LOWER QUADRANT: Non-compressible tubular blind-ending loop measuring 8.8 mm in transverse outer diameter. Surrounding hypervascularity and mesenteric fat stranding.',
        '{"appendiceal_diameter": 8.8, "compressible": false, "peritonitis_signs": true}'::jsonb,
        0.9780,
        'completed',
        NULL,
        '70000000-0000-0000-0000-000000000005',
        now() - interval '25 days',
        now() - interval '25 days'
    ),
    (
        'fa000000-0000-0000-0000-000000000004',
        'f0000000-0000-0000-0000-000000000004',
        'Angiography Luminal Caliper Extraction',
        'CTA HEAD AND NECK: Right carotid bulb shows eccentric calcified atherosclerotic plaque producing 65% lumen narrowing by NASCET method. No distal intracranial major branch occlusion.',
        '{"stenosis": 65.2, "nascet_verified": true, "location": "Right internal carotid artery"}'::jsonb,
        0.9650,
        'completed',
        NULL,
        '70000000-0000-0000-0000-000000000008',
        now() - interval '55 days',
        now() - interval '55 days'
    ),
    (
        'fa000000-0000-0000-0000-000000000005',
        'f0000000-0000-0000-0000-000000000005',
        'Multimodal Report Entity Extraction',
        'CHEST X-RAY: Blunting of left costophrenic sulcus indicating small pleural effusion. RENAL US: Kidneys demonstrate bilateral mild cortical hyperechogenicity with preserved dimensions.',
        '{"effusion_detected": true, "side": "left", "renal_cortical_echogenicity": "increased"}'::jsonb,
        0.9810,
        'completed',
        NULL,
        '70000000-0000-0000-0000-000000000009',
        now() - interval '40 days',
        now() - interval '40 days'
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 18. clinical_findings (5 High-Value Clinical Findings)
-- -----------------------------------------------------------------------------
INSERT INTO public.clinical_findings (id, patient_id, encounter_id, workflow_id, agent_run_id, finding_category, finding_title, finding_description, severity, evidence, confidence, status, created_at)
VALUES
    (
        'cf000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000001',
        'e0000000-0000-0000-0000-000000000002',
        '60000000-0000-0000-0000-000000000001',
        '70000000-0000-0000-0000-000000000001',
        'Neuro-radiology Finding',
        'Periventricular Demyelinating Plaque Burden',
        '14 discrete hyperintense demyelinating lesions identified on 3D FLAIR, meeting spatial criteria for McDonald 2017 Multiple Sclerosis diagnosis.',
        'High',
        '[{"slice": 48, "region": "periventricular", "size_mm": 9.4}, {"slice": 52, "region": "corpus_callosum", "size_mm": 7.1}]'::jsonb,
        0.9850,
        'confirmed',
        now() - interval '71 days'
    ),
    (
        'cf000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000002',
        'e0000000-0000-0000-0000-000000000005',
        '60000000-0000-0000-0000-000000000002',
        '70000000-0000-0000-0000-000000000003',
        'Pulmonary Nodule Alert',
        '6.2 mm Non-Calcified Solid Nodule (Lung-RADS 3)',
        'Solitary solid pulmonary nodule in apical segment of RUL requiring surveillance CT in 6-12 months per Fleischner criteria.',
        'Moderate',
        '[{"modality": "CT", "slice_index": 142, "dimensions_mm": [6.2, 5.9]}]'::jsonb,
        0.9920,
        'confirmed',
        now() - interval '66 days'
    ),
    (
        'cf000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000003',
        'e0000000-0000-0000-0000-000000000007',
        '60000000-0000-0000-0000-000000000003',
        '70000000-0000-0000-0000-000000000005',
        'Acute Surgical Finding',
        'Acute Appendicitis with Appendicolith',
        'Non-compressible blind-ending appendiceal loop measuring 8.8 mm in outer diameter with surrounding echogenic fat stranding.',
        'Critical',
        '[{"modality": "US", "diameter_mm": 8.8, "appendicolith_present": true}]'::jsonb,
        0.9780,
        'confirmed',
        now() - interval '25 days'
    ),
    (
        'cf000000-0000-0000-0000-000000000004',
        '20000000-0000-0000-0000-000000000004',
        'e0000000-0000-0000-0000-000000000009',
        '60000000-0000-0000-0000-000000000004',
        '70000000-0000-0000-0000-000000000008',
        'Vascular Stenosis Alert',
        'Significant Right Internal Carotid Artery Stenosis',
        '65% NASCET luminal narrowing of proximal right internal carotid artery in patient with acute right MCA territory stroke.',
        'High',
        '[{"modality": "CTA", "stenosis_percentage": 65.2, "nascet_ratio": 0.65}]'::jsonb,
        0.9650,
        'confirmed',
        now() - interval '55 days'
    ),
    (
        'cf000000-0000-0000-0000-000000000005',
        '20000000-0000-0000-0000-000000000005',
        'e0000000-0000-0000-0000-000000000011',
        '60000000-0000-0000-0000-000000000005',
        '70000000-0000-0000-0000-000000000009',
        'Autoimmune Serositis Finding',
        'Lupus-Associated Left Pleural Effusion',
        'Blunting of left costophrenic angle with small pleural fluid collection occurring during SLE flare with severe complement consumption.',
        'Moderate',
        '[{"modality": "CXR", "findings": "Blunting of left costophrenic sulcus", "fluid_volume_est": "100-150 mL"}]'::jsonb,
        0.9810,
        'confirmed',
        now() - interval '40 days'
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 19. clinical_reports (5 Synthesized AI Diagnostic Reports)
-- -----------------------------------------------------------------------------
INSERT INTO public.clinical_reports (id, patient_id, encounter_id, workflow_id, report_version, report_content, structured_report, status, generated_at, updated_at)
VALUES
    (
        'b0000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000001',
        'e0000000-0000-0000-0000-000000000002',
        '60000000-0000-0000-0000-000000000001',
        1,
        'AI CDSS CLINICAL SUMMARY REPORT:
Patient: Sarah Johnson | ID: PT-10021 | DEMO RECORD
Indication: Brain MRI evaluation for demyelinating disease.
Analysis: Automated 3D FLAIR volumetric lesion detection identified 14 plaques characteristic of multiple sclerosis. Intrathecal oligoclonal band positivity satisfies criteria for dissemination in time.
Impression: Relapsing-Remitting Multiple Sclerosis.',
        '{"ai_model": "med-gemini-vision-pro", "diagnosis": "Multiple Sclerosis (RRMS)", "mcdonald_criteria_met": true, "lesion_count": 14, "recommendation": "Initiate Disease-Modifying Therapy"}'::jsonb,
        'finalized',
        now() - interval '71 days',
        now() - interval '71 days'
    ),
    (
        'b0000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000002',
        'e0000000-0000-0000-0000-000000000005',
        '60000000-0000-0000-0000-000000000002',
        1,
        'AI CDSS CLINICAL SUMMARY REPORT:
Patient: Michael Chen | ID: PT-10045 | DEMO RECORD
Indication: High-Resolution Chest CT nodule risk evaluation.
Analysis: Single 6.2 mm solid nodule detected in right upper lobe apical segment. Centrilobular emphysema quantified at 18.4% lung parenchymal volume.
Impression: Lung-RADS 3 (Probably Benign). Fleischner Society guidelines recommend surveillance CT in 6-12 months.',
        '{"ai_model": "med-gemini-vision-pro", "lung_rads": 3, "nodule_size_mm": 6.2, "emphysema_score": 18.4, "recommendation": "LDCT in 6-12 months"}'::jsonb,
        'finalized',
        now() - interval '66 days',
        now() - interval '66 days'
    ),
    (
        'b0000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000003',
        'e0000000-0000-0000-0000-000000000007',
        '60000000-0000-0000-0000-000000000003',
        1,
        'AI CDSS CLINICAL SUMMARY REPORT:
Patient: Emily Rodriguez | ID: PT-10089 | DEMO RECORD
Indication: Acute right lower quadrant abdominal pain evaluation.
Analysis: Graded compression ultrasound features characteristic of acute appendicitis: 8.8 mm non-compressible appendix with appendicolith and localized free fluid. Alvarado Score 8/10.
Impression: Acute Suppurative Appendicitis.',
        '{"ai_model": "med-gemini-emergency-v1", "condition": "Acute Appendicitis", "appendix_diameter_mm": 8.8, "alvarado_score": 8, "urgency": "Immediate Surgical Consult"}'::jsonb,
        'finalized',
        now() - interval '25 days',
        now() - interval '25 days'
    ),
    (
        'b0000000-0000-0000-0000-000000000004',
        '20000000-0000-0000-0000-000000000004',
        'e0000000-0000-0000-0000-000000000009',
        '60000000-0000-0000-0000-000000000004',
        1,
        'AI CDSS CLINICAL SUMMARY REPORT:
Patient: James Williams | ID: PT-10112 | DEMO RECORD
Indication: Acute stroke neurovascular evaluation.
Analysis: ASPECTS score 8/10 on non-contrast CT. CTA reveals 65% stenosis of right internal carotid artery. No large vessel occlusion.
Impression: Acute right MCA territory ischemic stroke in setting of atrial fibrillation and high-grade carotid stenosis.',
        '{"ai_model": "neuro-cta-fast-v2", "aspects_score": 8, "carotid_stenosis_percent": 65.2, "etiology": "Cardioembolic + Atherosclerotic", "recommendation": "Full Anticoagulation & Statin"}'::jsonb,
        'finalized',
        now() - interval '55 days',
        now() - interval '55 days'
    ),
    (
        'b0000000-0000-0000-0000-000000000005',
        '20000000-0000-0000-0000-000000000005',
        'e0000000-0000-0000-0000-000000000011',
        '60000000-0000-0000-0000-000000000005',
        1,
        'AI CDSS CLINICAL SUMMARY REPORT:
Patient: Aisha Patel | ID: PT-10164 | DEMO RECORD
Indication: Systemic lupus erythematosus multi-organ flare assessment.
Analysis: CXR demonstrates small left pleural effusion secondary to lupus serositis. Hypocomplementemia (C3 58, C4 8.2) and elevated anti-dsDNA (88 IU/mL). SLEDAI-2K score 10.
Impression: Active SLE flare with pleuritis and stable Class II lupus nephritis.',
        '{"ai_model": "rheum-cdss-v1", "sledai_score": 10, "manifestations": ["pleuritis", "hypocomplementemia"], "recommendation": "Steroid taper and 4-week serology follow-up"}'::jsonb,
        'finalized',
        now() - interval '40 days',
        now() - interval '40 days'
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 20. report_reviews (5 Physician Oversight Attestations)
-- -----------------------------------------------------------------------------
INSERT INTO public.report_reviews (id, report_id, doctor_id, review_status, comments, reviewed_at, created_at)
VALUES
    ('bf000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'approved', 'DEMO: I have reviewed the automated segmentation and McDonald criteria alignment. Diagnosis of RRMS confirmed. Glatiramer acetate initiated.', now() - interval '70 days', now() - interval '70 days'),
    ('bf000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'approved', 'DEMO: Verified 6.2 mm nodule on coronal and axial thin cuts. Agree with Lung-RADS 3 assignment. Follow-up low-dose CT scheduled for 6 months.', now() - interval '65 days', now() - interval '65 days'),
    ('bf000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'approved', 'DEMO: Ultrasound images confirm classic appendicolith and non-compressible wall. Transferred immediately for laparoscopic surgery.', now() - interval '25 days', now() - interval '25 days'),
    ('bf000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'approved', 'DEMO: ASPECTS 8 confirmed with subtle insular ribbon loss. Carotid stenosis verified at ~65%. Patient started on oral anticoagulation.', now() - interval '54 days', now() - interval '54 days'),
    ('bf000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'approved', 'DEMO: Left pleural blunting concordant with pleuritic clinical symptoms. Prednisone taper approved.', now() - interval '39 days', now() - interval '39 days')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 21. document_chunks (5 Vector Chunks with 384-dimensional Embeddings)
-- -----------------------------------------------------------------------------
INSERT INTO public.document_chunks (id, patient_id, encounter_id, medical_file_id, extraction_id, chunk_text, chunk_index, embedding, metadata, created_at)
VALUES
    (
        'dc000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000001',
        'e0000000-0000-0000-0000-000000000002',
        'f0000000-0000-0000-0000-000000000001',
        'fa000000-0000-0000-0000-000000000001',
        'Brain MRI 3T: 14 distinct periventricular and juxtacortical T2/FLAIR hyperintensities perpendicular to lateral ventricles (Dawson fingers). CSF positive for oligoclonal bands, confirming MS dissemination in space.',
        0,
        public.seed_vector(0.1428),
        '{"patient_id": "p0000000-0000-0000-0000-000000000001", "modality": "MR", "specialty": "Neuroradiology"}'::jsonb,
        now() - interval '71 days'
    ),
    (
        'dc000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000002',
        'e0000000-0000-0000-0000-000000000005',
        'f0000000-0000-0000-0000-000000000002',
        'fa000000-0000-0000-0000-000000000002',
        'Chest HRCT: Solitary non-calcified solid nodule measuring 6.2 mm in the right upper lobe apical segment. Centrilobular emphysema in bilateral upper lobes. Classified as Lung-RADS 3; surveillance CT recommended.',
        0,
        public.seed_vector(0.2857),
        '{"patient_id": "p0000000-0000-0000-0000-000000000002", "modality": "CT", "specialty": "Thoracic"}'::jsonb,
        now() - interval '66 days'
    ),
    (
        'dc000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000003',
        'e0000000-0000-0000-0000-000000000007',
        'f0000000-0000-0000-0000-000000000003',
        'fa000000-0000-0000-0000-000000000003',
        'Abdominal Ultrasound: Aperistaltic, non-compressible appendix measuring 8.8 mm in transverse outer diameter with appendicolith and localized periappendiceal fat stranding, diagnostic of acute appendicitis.',
        0,
        public.seed_vector(0.4285),
        '{"patient_id": "p0000000-0000-0000-0000-000000000003", "modality": "US", "specialty": "Emergency"}'::jsonb,
        now() - interval '25 days'
    ),
    (
        'dc000000-0000-0000-0000-000000000004',
        '20000000-0000-0000-0000-000000000004',
        'e0000000-0000-0000-0000-000000000009',
        'f0000000-0000-0000-0000-000000000004',
        'fa000000-0000-0000-0000-000000000004',
        'CTA Head and Neck: 65% NASCET luminal stenosis of proximal right internal carotid artery. Non-contrast head CT demonstrates ASPECTS score 8/10 without intracranial hemorrhage.',
        0,
        public.seed_vector(0.5714),
        '{"patient_id": "p0000000-0000-0000-0000-000000000004", "modality": "CTA", "specialty": "Neurovascular"}'::jsonb,
        now() - interval '55 days'
    ),
    (
        'dc000000-0000-0000-0000-000000000005',
        '20000000-0000-0000-0000-000000000005',
        'e0000000-0000-0000-0000-000000000011',
        'f0000000-0000-0000-0000-000000000005',
        'fa000000-0000-0000-0000-000000000005',
        'Chest X-Ray & Renal Ultrasound: Small left pleural effusion secondary to lupus serositis. Renal parenchymal echogenicity mildly elevated bilaterally with preserved corticomedullary borders.',
        0,
        public.seed_vector(0.7142),
        '{"patient_id": "p0000000-0000-0000-0000-000000000005", "modality": "Multimodal", "specialty": "Rheumatology"}'::jsonb,
        now() - interval '40 days'
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 22. knowledge_sources (3 Evidence Bases)
-- -----------------------------------------------------------------------------
INSERT INTO public.knowledge_sources (id, name, source_type, source_url, description, license_info, created_at, updated_at)
VALUES
    (
        '80000000-0000-0000-0000-000000000001',
        'American College of Radiology (ACR) Appropriateness Criteria',
        'Clinical Practice Guidelines',
        'https://acsearch.acr.org/list',
        'Evidence-based guidelines to assist referring physicians and radiologists in making the most appropriate imaging decisions.',
        'ACR Open Access Educational License',
        now(),
        now()
    ),
    (
        '80000000-0000-0000-0000-000000000002',
        'Fleischner Society Guidelines for Pulmonary Nodules',
        'Consensus Recommendations',
        'https://pubs.rsna.org/doi/10.1148/radiol.2017161659',
        'International consensus recommendations for the management of incidental pulmonary nodules detected on CT.',
        'RSNA Journal Access License',
        now(),
        now()
    ),
    (
        '80000000-0000-0000-0000-000000000003',
        'AHA / ASA Acute Ischemic Stroke Management Guidelines',
        'National Clinical Guidelines',
        'https://www.ahajournals.org/doi/10.1161/STR.0000000000000211',
        'Comprehensive clinical guideline recommendations for the immediate diagnosis, neuroimaging, and therapy of acute ischemic stroke.',
        'AHA/ASA Open Educational Distribution',
        now(),
        now()
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 23. knowledge_documents (3 Evidence Documents)
-- -----------------------------------------------------------------------------
INSERT INTO public.knowledge_documents (id, source_id, title, file_path, file_type, category, subcategory, specialty_tags, agent_tags, ingestion_status, error_message, chunk_count, metadata, created_at, updated_at)
VALUES
    (
        '8d000000-0000-0000-0000-000000000001',
        '80000000-0000-0000-0000-000000000001',
        'ACR Appropriateness Criteria: Suspected Multiple Sclerosis',
        'guidelines/acr_suspected_multiple_sclerosis_2024.pdf',
        'PDF',
        'Radiology Guidelines',
        'Neuroradiology',
        ARRAY['Neurology', 'Neuroradiology', 'Demyelinating Disease', 'MRI'],
        ARRAY['NeuroVisionSegmenterAgent', 'McDonaldCriteriaAdvisorAgent'],
        'completed',
        NULL,
        2,
        '{"year": 2024, "version": "1.0", "target_disease": "Multiple Sclerosis"}'::jsonb,
        now(),
        now()
    ),
    (
        '8d000000-0000-0000-0000-000000000002',
        '80000000-0000-0000-0000-000000000002',
        'Fleischner Society Guidelines: Management of Incidental Pulmonary Nodules in Adults',
        'guidelines/fleischner_society_pulmonary_nodules_2024.pdf',
        'PDF',
        'Thoracic Imaging',
        'Pulmonary Nodules',
        ARRAY['Thoracic Radiology', 'Pulmonology', 'Oncology', 'CT'],
        ARRAY['ThoracicNoduleDetectorAgent', 'FleischnerGuidelineMatcherAgent'],
        'completed',
        NULL,
        2,
        '{"year": 2024, "target_structure": "Pulmonary Nodule"}'::jsonb,
        now(),
        now()
    ),
    (
        '8d000000-0000-0000-0000-000000000003',
        '80000000-0000-0000-0000-000000000003',
        '2024 AHA/ASA Guidelines for the Early Management of Patients with Acute Ischemic Stroke',
        'guidelines/aha_asa_acute_ischemic_stroke_guidelines_2024.pdf',
        'PDF',
        'Vascular Neurology',
        'Acute Stroke',
        ARRAY['Neurovascular', 'Emergency Medicine', 'Stroke', 'CTA'],
        ARRAY['ASPECTSQuantifierAgent', 'CTAStenosisAnalyzerAgent'],
        'completed',
        NULL,
        2,
        '{"year": 2024, "target_condition": "Ischemic Stroke"}'::jsonb,
        now(),
        now()
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 24. knowledge_chunks (3 Reference Chunks with 384-dimensional Embeddings)
-- -----------------------------------------------------------------------------
INSERT INTO public.knowledge_chunks (id, document_id, source_id, category, subcategory, title, chunk_text, chunk_index, embedding, metadata, source_url, publication_date, version, page_number, section_reference, license_info, specialty_tags, agent_tags, created_at)
VALUES
    (
        '8c000000-0000-0000-0000-000000000001',
        '8d000000-0000-0000-0000-000000000001',
        '80000000-0000-0000-0000-000000000001',
        'Radiology Guidelines',
        'Neuroradiology',
        'MRI Protocol for Multiple Sclerosis Diagnosis',
        'In patients presenting with a clinically isolated syndrome (CIS) or suspected MS, brain MRI with 3D T2-weighted FLAIR and axial T1 and T2 sequences is the primary modality. Dissemination in space requires one or more T2-hyperintense lesions in at least two of four MS-typical CNS regions: periventricular, cortical/juxtacortical, infratentorial, and spinal cord.',
        0,
        public.seed_vector(0.3333),
        '{"section": "Diagnostic Criteria", "confidence": "Level A Evidence"}'::jsonb,
        'https://acsearch.acr.org/docs/69482/Narrative/',
        '2024-01-15',
        '2024.1',
        4,
        'Section 3.1: MRI Protocol and Space Dissemination',
        'ACR Open Access',
        ARRAY['Neuroradiology', 'Multiple Sclerosis', 'FLAIR'],
        ARRAY['McDonaldCriteriaAdvisorAgent'],
        now()
    ),
    (
        '8c000000-0000-0000-0000-000000000002',
        '8d000000-0000-0000-0000-000000000002',
        '80000000-0000-0000-0000-000000000002',
        'Thoracic Imaging',
        'Pulmonary Nodules',
        'Management of Solid Incidental Nodules 6-8 mm',
        'For single solid non-calcified nodules measuring 6 to 8 mm in high-risk patients (e.g. smoking history >= 30 pack-years or older age), follow-up low-dose CT chest is recommended at 6 to 12 months, and then again at 18 to 24 months if unchanged. Routine PET-CT or tissue biopsy is not typically recommended unless morphological suspicion is elevated.',
        0,
        public.seed_vector(0.6666),
        '{"section": "Table 1: Solid Nodule Management", "risk_tier": "High Risk"}'::jsonb,
        'https://pubs.rsna.org/doi/10.1148/radiol.2017161659',
        '2024-02-01',
        '2024.1',
        6,
        'Table 1: Recommendations for Solid Nodules',
        'RSNA Journal Access',
        ARRAY['Thoracic', 'Pulmonary Nodule', 'Fleischner'],
        ARRAY['FleischnerGuidelineMatcherAgent'],
        now()
    ),
    (
        '8c000000-0000-0000-0000-000000000003',
        '8d000000-0000-0000-0000-000000000003',
        '80000000-0000-0000-0000-000000000003',
        'Vascular Neurology',
        'Acute Stroke',
        'Imaging Selection and Carotid Assessment in Acute Stroke',
        'Non-contrast CT head rapidly excludes intracranial hemorrhage. In candidate patients within the extended therapeutic window or with severe stroke, CTA from aortic arch to vertex is recommended to detect large vessel occlusions and evaluate carotid bifurcations. Extracranial internal carotid stenosis >= 50% in symptomatic stroke warrants secondary prevention optimization and urgent multidisciplinary revascularization review.',
        0,
        public.seed_vector(0.9999),
        '{"section": "Section 4: Vascular Neuroimaging", "class_of_recommendation": "Class I"}'::jsonb,
        'https://www.ahajournals.org/doi/10.1161/STR.0000000000000211',
        '2024-03-10',
        '2024.2',
        11,
        'Section 4.2: CTA and Extracranial Carotid Evaluation',
        'AHA/ASA Open',
        ARRAY['Neurovascular', 'CTA', 'Stroke', 'Carotid Stenosis'],
        ARRAY['CTAStenosisAnalyzerAgent'],
        now()
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 25. knowledge_ingestion_jobs (3 Completed Jobs)
-- -----------------------------------------------------------------------------
INSERT INTO public.knowledge_ingestion_jobs (id, document_id, status, started_at, completed_at, error_message, chunks_created, created_at)
VALUES
    ('90000000-0000-0000-0000-000000000001', '8d000000-0000-0000-0000-000000000001', 'completed', now() - interval '2 days', now() - interval '2 days' + interval '45 seconds', NULL, 2, now() - interval '2 days'),
    ('90000000-0000-0000-0000-000000000002', '8d000000-0000-0000-0000-000000000002', 'completed', now() - interval '2 days', now() - interval '2 days' + interval '38 seconds', NULL, 2, now() - interval '2 days'),
    ('90000000-0000-0000-0000-000000000003', '8d000000-0000-0000-0000-000000000003', 'completed', now() - interval '2 days', now() - interval '2 days' + interval '52 seconds', NULL, 2, now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 26. audit_logs (5 Compliance & HIPAA Access Records)
-- -----------------------------------------------------------------------------
INSERT INTO public.audit_logs (id, user_id, patient_id, action, entity_type, entity_id, metadata, created_at)
VALUES
    ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'VIEW_PATIENT_RECORD', 'patients', '20000000-0000-0000-0000-000000000001', '{"ip_address": "10.240.12.44", "reason": "Follow-up consultation", "demo": true}'::jsonb, now() - interval '70 days'),
    ('a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'TRIGGER_AI_WORKFLOW', 'ai_workflows', '60000000-0000-0000-0000-000000000001', '{"workflow_type": "neuro_mri_demyelinating_eval", "demo": true}'::jsonb, now() - interval '71 days 10 hours'),
    ('a0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'APPROVE_CLINICAL_REPORT', 'clinical_reports', 'b0000000-0000-0000-0000-000000000002', '{"report_version": 1, "approved_by": "Dr. Raj Patel", "demo": true}'::jsonb, now() - interval '65 days'),
    ('a0000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', NULL, 'VIEW_SYSTEM_AUDIT_LOGS', 'a0dit_logs', NULL, '{"admin_user": "admin_sys", "scope": "full_audit", "demo": true}'::jsonb, now() - interval '1 day'),
    ('a0000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'PATIENT_PORTAL_VIEW', 'clinical_reports', 'b0000000-0000-0000-0000-000000000001', '{"portal_access": "web_mobile", "patient": "Sarah Johnson", "demo": true}'::jsonb, now() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Clean up temporary helper function
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.seed_vector(float);
