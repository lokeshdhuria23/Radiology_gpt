// ─── Auth ────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  full_name?: string
  username?: string
  role: string
  specialty?: string | null
  license_number?: string | null
  patient_id?: string | null
  patient_identifier?: string | null
  is_active: boolean
  created_at?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  full_name: string
  username?: string
  role: 'doctor' | 'patient' | 'admin'
  specialty?: string
  license_number?: string
  date_of_birth?: string
  sex?: string
  phone?: string
  consultation_type?: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

// ─── Patient ─────────────────────────────────────────────────
export interface Patient {
  id: string
  user_id?: string
  medical_record_number: string
  patient_identifier?: string
  first_name: string
  last_name: string
  full_name?: string
  date_of_birth: string
  gender: string
  sex?: string
  specialty?: string
  consultation_type?: string
  blood_type?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  contact_info?: any
  emergency_contact?: any
  insurance_provider?: string | null
  insurance_id?: string | null
  is_active?: boolean
  created_at: string
  updated_at?: string
}

export interface PatientCreate {
  medical_record_number?: string
  patient_identifier?: string
  first_name?: string
  last_name?: string
  full_name?: string
  date_of_birth: string
  gender?: string
  sex?: string
  specialty?: string
  consultation_type?: string
  blood_type?: string
  phone?: string
  email?: string
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  insurance_provider?: string
  insurance_id?: string
}

// ─── Encounter ───────────────────────────────────────────────
export interface Encounter {
  id: string
  patient_id: string
  doctor_id: string
  encounter_type: string
  status: string
  chief_complaint?: string | null
  visit_date: string
  discharge_date?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface EncounterCreate {
  encounter_type: string
  chief_complaint?: string
  visit_date?: string
  notes?: string
}

// ─── Vitals ──────────────────────────────────────────────────
export interface Vital {
  id: string
  encounter_id: string
  temperature?: number | null
  heart_rate?: number | null
  blood_pressure_systolic?: number | null
  blood_pressure_diastolic?: number | null
  respiratory_rate?: number | null
  oxygen_saturation?: number | null
  weight_kg?: number | null
  height_cm?: number | null
  bmi?: number | null
  recorded_at: string
  created_at: string
}

export interface VitalCreate {
  encounter_id: string
  temperature?: number
  heart_rate?: number
  blood_pressure_systolic?: number
  blood_pressure_diastolic?: number
  respiratory_rate?: number
  oxygen_saturation?: number
  weight_kg?: number
  height_cm?: number
  recorded_at?: string
}

// ─── Condition ───────────────────────────────────────────────
export interface Condition {
  id: string
  patient_id: string
  name: string
  icd_code?: string | null
  status: string
  severity?: string | null
  onset_date?: string | null
  resolved_date?: string | null
  notes?: string | null
  created_at: string
}

export interface ConditionCreate {
  name: string
  icd_code?: string
  status?: string
  severity?: string
  onset_date?: string
  resolved_date?: string
  notes?: string
}

// ─── Allergy ─────────────────────────────────────────────────
export interface Allergy {
  id: string
  patient_id: string
  allergen: string
  reaction?: string | null
  severity: string
  status: string
  onset_date?: string | null
  notes?: string | null
  created_at: string
}

export interface AllergyCreate {
  allergen: string
  reaction?: string
  severity?: string
  status?: string
  onset_date?: string
  notes?: string
}

// ─── Medication ──────────────────────────────────────────────
export interface Medication {
  id: string
  patient_id: string
  name: string
  dosage?: string | null
  frequency?: string | null
  route?: string | null
  status: string
  prescribed_date?: string | null
  end_date?: string | null
  prescribing_doctor?: string | null
  notes?: string | null
  created_at: string
}

export interface MedicationCreate {
  name: string
  dosage?: string
  frequency?: string
  route?: string
  status?: string
  prescribed_date?: string
  end_date?: string
  prescribing_doctor?: string
  notes?: string
}

// ─── Lab Result ──────────────────────────────────────────────
export interface LabResult {
  id: string
  patient_id: string
  encounter_id?: string | null
  test_name: string
  test_code?: string | null
  value: string
  unit?: string | null
  reference_range?: string | null
  is_abnormal: boolean
  collected_at?: string | null
  resulted_at?: string | null
  lab_name?: string | null
  notes?: string | null
  created_at: string
}

export interface LabResultCreate {
  encounter_id?: string
  test_name: string
  test_code?: string
  value: string
  unit?: string
  reference_range?: string
  is_abnormal?: boolean
  collected_at?: string
  resulted_at?: string
  lab_name?: string
  notes?: string
}

// ─── Clinical Note ───────────────────────────────────────────
export interface ClinicalNote {
  id: string
  encounter_id: string
  note_type: string
  content: string
  author_id: string
  is_ai_generated: boolean
  created_at: string
  updated_at: string
}

export interface ClinicalNoteCreate {
  encounter_id: string
  note_type: string
  content: string
  is_ai_generated?: boolean
}

// ─── Documents ───────────────────────────────────────────────
export interface MedicalFile {
  id: string
  patient_id: string
  encounter_id?: string | null
  file_name: string
  file_type: string
  mime_type: string
  file_size: number
  storage_path: string
  category?: string | null
  description?: string | null
  is_processed: boolean
  processing_status?: string | null
  uploaded_by: string
  created_at: string
}

export interface DocumentExtraction {
  id: string
  file_id: string
  extraction_type: string
  raw_text?: string | null
  structured_data?: Record<string, unknown> | null
  confidence_score?: number | null
  extracted_entities?: Record<string, unknown> | null
  processing_time_ms?: number | null
  model_used?: string | null
  is_verified: boolean
  created_at: string
}

// ─── Workflow / Agents ───────────────────────────────────────
export interface AIWorkflow {
  id: string
  patient_id: string
  encounter_id?: string | null
  initiated_by: string
  status: string
  workflow_type: string
  config?: Record<string, unknown> | null
  started_at: string
  completed_at?: string | null
  error_message?: string | null
  created_at: string
}

export interface AgentRun {
  id: string
  workflow_id: string
  agent_type: string
  status: string
  input_data?: Record<string, unknown> | null
  output_data?: Record<string, unknown> | null
  error_message?: string | null
  execution_time_ms?: number | null
  model_used?: string | null
  is_demo_mode: boolean
  started_at: string
  completed_at?: string | null
}

export interface ClinicalFinding {
  id: string
  workflow_id: string
  agent_run_id: string
  finding_type: string
  category: string
  title: string
  description: string
  severity?: string | null
  confidence?: number | null
  evidence?: string[] | null
  recommendations?: string[] | null
  metadata?: Record<string, unknown> | null
  is_reviewed: boolean
  reviewed_by?: string | null
  reviewed_at?: string | null
  created_at: string
}

// ─── Reports ─────────────────────────────────────────────────
export interface ClinicalReport {
  id: string
  workflow_id: string
  patient_id: string
  encounter_id?: string | null
  report_type: string
  title: string
  summary: string
  sections: Record<string, unknown>
  findings_count: number
  critical_findings_count: number
  status: string
  generated_at: string
  is_demo_mode: boolean
  created_at: string
  updated_at: string
}

export interface ReportReview {
  id: string
  report_id: string
  reviewer_id: string
  decision: string
  comments?: string | null
  reviewed_sections?: Record<string, unknown> | null
  created_at: string
}

export interface ReportReviewCreate {
  decision: 'approved' | 'rejected' | 'needs_revision'
  comments?: string
  reviewed_sections?: Record<string, unknown>
}

// ─── Dashboard ───────────────────────────────────────────────
export interface DashboardStats {
  total_patients: number
  total_encounters: number
  total_workflows: number
  pending_reviews: number
  recent_patients: Patient[]
  recent_workflows: AIWorkflow[]
}

// ─── Knowledge Base ──────────────────────────────────────────
export interface KnowledgeSource {
  id: string
  name: string
  source_type: string
  description?: string | null
  is_active: boolean
  created_at: string
}

export interface KnowledgeDocument {
  id: string
  source_id: string
  title: string
  content?: string | null
  document_type?: string | null
  file_path?: string | null
  is_indexed: boolean
  chunk_count: number
  created_at: string
}

// ─── RAG ─────────────────────────────────────────────────────
export interface RAGSearchResult {
  chunk_id: string
  content: string
  similarity: number
  source: string
  metadata?: Record<string, unknown>
}

// ─── System ──────────────────────────────────────────────────
export interface SystemStatus {
  status: string
  version: string
  demo_mode: boolean
  models: Record<string, ModelStatus>
  database: string
  storage: string
}

export interface ModelStatus {
  name: string
  status: string
  type: string
  device?: string
}

// ─── Paginated ───────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
