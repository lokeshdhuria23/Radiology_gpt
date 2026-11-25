import api from '@/lib/api'
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  Patient,
  PatientCreate,
  Encounter,
  EncounterCreate,
  Vital,
  VitalCreate,
  Condition,
  ConditionCreate,
  Allergy,
  AllergyCreate,
  Medication,
  MedicationCreate,
  LabResult,
  LabResultCreate,
  ClinicalNote,
  ClinicalNoteCreate,
  MedicalFile,
  DocumentExtraction,
  AIWorkflow,
  AgentRun,
  ClinicalFinding,
  ClinicalReport,
  ReportReview,
  ReportReviewCreate,
  DashboardStats,
  KnowledgeSource,
  KnowledgeDocument,
  RAGSearchResult,
  SystemStatus,
} from '@/types'

// Helper to normalize patient objects across backend naming differences
function normalizePatient(p: any): Patient {
  if (!p) return p
  const fullName = p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown'
  const parts = fullName.split(' ')
  return {
    ...p,
    full_name: fullName,
    first_name: p.first_name || parts[0] || '',
    last_name: p.last_name || (parts.length > 1 ? parts.slice(1).join(' ') : ''),
    medical_record_number: p.medical_record_number || p.patient_identifier || '',
    patient_identifier: p.patient_identifier || p.medical_record_number || '',
    gender: p.gender || p.sex || 'other',
    sex: p.sex || p.gender || 'other',
    specialty: p.specialty || p.contact_info?.specialty || p.consultation_type || p.contact_info?.consultation_type || 'Radiology',
    consultation_type: p.consultation_type || p.contact_info?.consultation_type || p.specialty || p.contact_info?.specialty || 'Radiology',
    is_active: p.is_active !== undefined ? p.is_active : true,
  }
}

// ─── Auth ────────────────────────────────────────────────────
export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await api.post('/auth/login', data)
    return res.data
  },
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await api.post('/auth/register', data)
    return res.data
  },
  getMe: async () => {
    const res = await api.get('/auth/me')
    return res.data
  },
}

// ─── Patients ────────────────────────────────────────────────
export const patientService = {
  list: async (params?: { search?: string; page?: number; page_size?: number }): Promise<Patient[]> => {
    try {
      const res = await api.get<any>('/patients/', { params })
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || [])
      return items.map(normalizePatient)
    } catch {
      const res = await api.get<any>('/patients', { params })
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || [])
      return items.map(normalizePatient)
    }
  },
  get: async (id: string): Promise<Patient> => {
    try {
      const res = await api.get(`/patients/${id}`)
      return normalizePatient(res.data)
    } catch {
      const res = await api.get(`/patients/${id}/`)
      return normalizePatient(res.data)
    }
  },
  create: async (data: PatientCreate): Promise<Patient> => {
    // Send both field naming styles for bulletproof compatibility
    const fullName = data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim()
    const payload = {
      ...data,
      patient_identifier: data.patient_identifier || data.medical_record_number,
      full_name: fullName,
      sex: data.sex || data.gender || 'other',
    }
    try {
      const res = await api.post('/patients/', payload)
      return normalizePatient(res.data)
    } catch {
      const res = await api.post('/patients', payload)
      return normalizePatient(res.data)
    }
  },
  update: async (id: string, data: Partial<PatientCreate>): Promise<Patient> => {
    const res = await api.put(`/patients/${id}`, data)
    return normalizePatient(res.data)
  },
  updateConsultation: async (id: string, consultationType: string) => {
    const res = await api.patch(`/patients/${id}/consultation`, { consultation_type: consultationType })
    return res.data
  },
  getLongitudinalSummary: async (patientId: string): Promise<any> => {
    const res = await api.get(`/patients/${patientId}/longitudinal-summary`)
    return res.data
  },
  delete: async (id: string) => {
    await api.delete(`/patients/${id}`)
  },
}

// ─── Encounters ──────────────────────────────────────────────
export const encounterService = {
  listAll: async (): Promise<any[]> => {
    try {
      const res = await api.get<any>('/encounters')
      return Array.isArray(res.data) ? res.data : (res.data?.items || [])
    } catch {
      return []
    }
  },
  list: async (patientId: string): Promise<Encounter[]> => {
    // Try both encounter route formats
    try {
      const res = await api.get<any>(`/encounters/patient/${patientId}`)
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || [])
      return items
    } catch {
      const res = await api.get<any>(`/patients/${patientId}/encounters`)
      return Array.isArray(res.data) ? res.data : (res.data?.items || [])
    }
  },
  get: async (patientId: string, id: string): Promise<Encounter> => {
    try {
      const res = await api.get(`/encounters/${id}`)
      return res.data
    } catch {
      const res = await api.get(`/patients/${patientId}/encounters/${id}`)
      return res.data
    }
  },
  create: async (patientId: string, data: EncounterCreate): Promise<Encounter> => {
    const payload = { ...data, patient_id: patientId }
    try {
      const res = await api.post('/encounters', payload)
      return res.data
    } catch {
      const res = await api.post(`/patients/${patientId}/encounters`, payload)
      return res.data
    }
  },
  chat: async (params: {
    encounter_id?: string
    patient_id?: string
    prompt: string
    document_ids?: string[]
    specialty?: string
    title?: string
  }): Promise<any> => {
    const res = await api.post('/encounters/chat', params)
    return res.data
  },
  update: async (patientId: string, id: string, data: Partial<EncounterCreate>): Promise<Encounter> => {
    try {
      const res = await api.put(`/encounters/${id}`, data)
      return res.data
    } catch {
      const res = await api.put(`/patients/${patientId}/encounters/${id}`, data)
      return res.data
    }
  },
}

// ─── Generic Clinical CRUD ───────────────────────────────────
function clinicalCrud<T, C>(entityPath: string) {
  return {
    list: async (patientId: string): Promise<T[]> => {
      const res = await api.get<any>(`/patients/${patientId}/${entityPath}`)
      return Array.isArray(res.data) ? res.data : (res.data?.items || [])
    },
    get: async (patientId: string, id: string): Promise<T> => {
      const res = await api.get(`/patients/${patientId}/${entityPath}/${id}`)
      return res.data
    },
    create: async (patientId: string, data: C): Promise<T> => {
      const res = await api.post(`/patients/${patientId}/${entityPath}`, data)
      return res.data
    },
    update: async (patientId: string, id: string, data: Partial<C>): Promise<T> => {
      const res = await api.put(`/patients/${patientId}/${entityPath}/${id}`, data)
      return res.data
    },
    delete: async (patientId: string, id: string) => {
      await api.delete(`/patients/${patientId}/${entityPath}/${id}`)
    },
  }
}

export const vitalService = clinicalCrud<Vital, VitalCreate>('vitals')
export const conditionService = clinicalCrud<Condition, ConditionCreate>('conditions')
export const allergyService = clinicalCrud<Allergy, AllergyCreate>('allergies')
export const medicationService = {
  ...clinicalCrud<Medication, MedicationCreate>('medications'),
  createBatch: async (patientId: string, medications: any[]): Promise<any> => {
    const res = await api.post('/clinical/medications/batch', {
      patient_id: patientId,
      medications,
    })
    return res.data
  },
}
export const labResultService = clinicalCrud<LabResult, LabResultCreate>('lab-results')
export const clinicalNoteService = clinicalCrud<ClinicalNote, ClinicalNoteCreate>('clinical-notes')

// ─── Documents ───────────────────────────────────────────────
export const documentService = {
  list: async (patientId: string): Promise<MedicalFile[]> => {
    const res = await api.get<any>(`/documents/patient/${patientId}`)
    const items = Array.isArray(res.data) ? res.data : (res.data?.items || [])
    return items.map((d: any) => ({
      ...d,
      file_name: d.file_name || d.original_filename || 'Document',
      category: d.category || d.document_category || 'general',
      is_processed: d.is_processed || d.processing_status === 'completed',
    }))
  },
  get: async (id: string): Promise<MedicalFile> => {
    const res = await api.get(`/documents/${id}`)
    const d = res.data
    return {
      ...d,
      file_name: d.file_name || d.original_filename || 'Document',
      category: d.category || d.document_category || 'general',
      is_processed: d.is_processed || d.processing_status === 'completed',
    }
  },
  upload: async (patientId: string, file: File, encounterId?: string, category?: string, description?: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('patient_id', patientId)
    if (encounterId) form.append('encounter_id', encounterId)
    if (category) form.append('category', category)
    if (description) form.append('description', description)
    // Post to /documents/upload/${patientId} as primary backend route
    const res = await api.post<any>(`/documents/upload/${patientId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },
  process: async (id: string) => {
    const res = await api.post<DocumentExtraction>(`/documents/${id}/process`)
    return res.data
  },
  getExtraction: async (id: string) => {
    const res = await api.get<DocumentExtraction>(`/documents/${id}/extraction`)
    return res.data
  },
  delete: async (id: string) => {
    await api.delete(`/documents/${id}`)
  },
}

// ─── Workflows ───────────────────────────────────────────────
export const workflowService = {
  start: async (patientId: string, encounterId?: string, config?: Record<string, unknown>): Promise<AIWorkflow> => {
    const res = await api.post('/workflows/start', {
      patient_id: patientId,
      encounter_id: encounterId,
      config,
    })
    return res.data
  },
  get: async (id: string): Promise<AIWorkflow> => {
    const res = await api.get(`/workflows/${id}`)
    return res.data
  },
  list: async (patientId?: string) => {
    const res = await api.get<AIWorkflow[]>('/workflows', { params: { patient_id: patientId } })
    return res.data
  },
  getAgentRuns: async (workflowId: string): Promise<AgentRun[]> => {
    const res = await api.get<AgentRun[] | { items: AgentRun[] }>(`/workflows/${workflowId}/agents`)
    const data = res.data
    if (Array.isArray(data)) return data
    if (data && typeof data === 'object' && Array.isArray((data as any).items)) return (data as any).items
    return []
  },
  getFindings: async (workflowId: string) => {
    const res = await api.get<ClinicalFinding[]>(`/workflows/${workflowId}/findings`)
    return res.data
  },
  cancel: async (id: string) => {
    const res = await api.post(`/workflows/${id}/cancel`)
    return res.data
  },
  retry: async (id: string) => {
    const res = await api.post(`/workflows/${id}/retry`)
    return res.data
  },
  runSingleAgent: async (workflowId: string, agentType: string) => {
    const res = await api.post(`/workflows/${workflowId}/agents/${agentType}/run`)
    return res.data
  },
}

// ─── Reports ─────────────────────────────────────────────────
export const reportService = {
  list: async (patientId?: string): Promise<ClinicalReport[]> => {
    const params = patientId ? { patient_id: patientId } : {}
    const res = await api.get<any>('/reports', { params })
    return Array.isArray(res.data) ? res.data : (res.data?.items || [])
  },
  get: async (id: string): Promise<ClinicalReport> => {
    const res = await api.get(`/reports/${id}`)
    return res.data
  },
  create: async (data: any): Promise<ClinicalReport> => {
    const res = await api.post('/reports', data)
    return res.data
  },
  generate: async (encounterId: string): Promise<ClinicalReport> => {
    const res = await api.post(`/reports/generate/${encounterId}`)
    return res.data
  },
  submitReview: async (reportId: string, data: ReportReviewCreate): Promise<ReportReview> => {
    const res = await api.post(`/reports/${reportId}/review`, data)
    return res.data
  },
  getReviews: async (reportId: string) => {
    const res = await api.get<ReportReview[]>(`/reports/${reportId}/reviews`)
    return res.data
  },
  sendToPatient: async (reportId: string, prescriptions?: any[], notes?: string) => {
    const res = await api.post(`/reports/${reportId}/send-to-patient`, {
      prescriptions,
      doctor_notes: notes || 'Reviewed, approved, and released by attending physician.',
    })
    return res.data
  },
}

// ─── Dashboard ───────────────────────────────────────────────
export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await api.get('/dashboard/stats')
    return res.data
  },
}

// ─── Knowledge Base ──────────────────────────────────────────
export const knowledgeService = {
  listSources: async () => {
    const res = await api.get<KnowledgeSource[]>('/knowledge/sources')
    return res.data
  },
  createSource: async (data: { name: string; source_type: string; description?: string }) => {
    const res = await api.post<KnowledgeSource>('/knowledge/sources', data)
    return res.data
  },
  listDocuments: async (sourceId: string) => {
    const res = await api.get<KnowledgeDocument[]>(`/knowledge/sources/${sourceId}/documents`)
    return res.data
  },
  uploadDocument: async (sourceId: string, file: File, title?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (title) form.append('title', title)
    const res = await api.post<KnowledgeDocument>(`/knowledge/sources/${sourceId}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },
}

// ─── RAG ─────────────────────────────────────────────────────
export const ragService = {
  searchPatientDocs: async (patientId: string, query: string, limit?: number) => {
    const res = await api.post<RAGSearchResult[]>('/rag/patient-search', {
      patient_id: patientId,
      query,
      limit: limit || 5,
    })
    return res.data
  },
  searchKnowledge: async (query: string, limit?: number) => {
    const res = await api.post<RAGSearchResult[]>('/rag/knowledge-search', {
      query,
      limit: limit || 5,
    })
    return res.data
  },
}

// ─── Settings / System ───────────────────────────────────────
export const settingsService = {
  getStatus: async (): Promise<SystemStatus> => {
    const res = await api.get('/settings/status')
    return res.data
  },
  getProfile: async (): Promise<any> => {
    const res = await api.get('/settings/profile')
    return res.data
  },
  updateProfile: async (data: any): Promise<any> => {
    const res = await api.put('/settings/profile', data)
    return res.data
  },
  updateSpecialty: async (specialty: string): Promise<any> => {
    const res = await api.put('/settings/specialty', { specialty })
    return res.data
  },
}

// ─── Ephemeral Patient Assistant (NO DB STORAGE) ──────────────
export const patientAssistantService = {
  chat: async (params: { message: string; patient_name?: string; allergies?: string[] }): Promise<{ reply: string; is_ephemeral: boolean; citation?: string }> => {
    const res = await api.post('/patient-assistant/chat', params)
    return res.data
  },
  analyzeReport: async (file: File, patient_name?: string): Promise<{ filename: string; assistant_response: string; lab_values: any[]; is_ephemeral: boolean }> => {
    const form = new FormData()
    form.append('file', file)
    if (patient_name) form.append('patient_name', patient_name)
    const res = await api.post('/patient-assistant/analyze-report', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },
}
