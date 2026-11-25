import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  patientService,
  encounterService,
  vitalService,
  conditionService,
  allergyService,
  medicationService,
  labResultService,
  clinicalNoteService,
  documentService,
  workflowService,
  reportService,
  dashboardService,
  knowledgeService,
  settingsService,
} from '@/services/api'
import type {
  PatientCreate,
  EncounterCreate,
  VitalCreate,
  ConditionCreate,
  AllergyCreate,
  MedicationCreate,
  LabResultCreate,
  ClinicalNoteCreate,
  ReportReviewCreate,
} from '@/types'

// ─── Dashboard ───────────────────────────────────────────────
export function useDashboardStats() {
  return useQuery({ queryKey: ['dashboard'], queryFn: dashboardService.getStats })
}

// ─── Patients ────────────────────────────────────────────────
export function usePatients(search?: string) {
  return useQuery({
    queryKey: ['patients', search],
    queryFn: () => patientService.list({ search }),
  })
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => patientService.get(id),
    enabled: !!id,
  })
}

export function useCreatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PatientCreate) => patientService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}

export function useUpdatePatient(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<PatientCreate>) => patientService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] })
      qc.invalidateQueries({ queryKey: ['patients', id] })
    },
  })
}

export function useUpdateConsultation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (consultationType: string) => patientService.updateConsultation(id, consultationType),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] })
      qc.invalidateQueries({ queryKey: ['patients', id] })
    },
  })
}

// ─── Encounters ──────────────────────────────────────────────
export function useAllEncounters() {
  return useQuery({
    queryKey: ['all-encounters'],
    queryFn: () => encounterService.listAll(),
  })
}

export function useEncounters(patientId: string) {
  return useQuery({
    queryKey: ['encounters', patientId],
    queryFn: () => encounterService.list(patientId),
    enabled: !!patientId,
  })
}

export function useEncounter(patientId: string, id: string) {
  return useQuery({
    queryKey: ['encounters', patientId, id],
    queryFn: () => encounterService.get(patientId, id),
    enabled: !!patientId && !!id,
  })
}

export function useCreateEncounter(patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EncounterCreate) => encounterService.create(patientId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['encounters', patientId] })
      qc.invalidateQueries({ queryKey: ['all-encounters'] })
    },
  })
}

export function useEncounterChat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      encounter_id?: string
      patient_id?: string
      prompt: string
      document_ids?: string[]
      specialty?: string
      title?: string
    }) => encounterService.chat(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-encounters'] })
    },
  })
}

// ─── Generic clinical hooks factory ─────────────────────────
function useClinicalList<T>(key: string, service: { list: (pid: string) => Promise<T[]> }, patientId: string) {
  return useQuery({
    queryKey: [key, patientId],
    queryFn: () => service.list(patientId),
    enabled: !!patientId,
  })
}

function useClinicalCreate<C>(key: string, service: { create: (pid: string, data: C) => Promise<unknown> }, patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: C) => service.create(patientId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [key, patientId] }),
  })
}

function useClinicalDelete(key: string, service: { delete: (pid: string, id: string) => Promise<void> }, patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => service.delete(patientId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [key, patientId] }),
  })
}

// Vitals
export const useVitals = (pid: string) => useClinicalList('vitals', vitalService, pid)
export const useCreateVital = (pid: string) => useClinicalCreate<VitalCreate>('vitals', vitalService, pid)
export const useDeleteVital = (pid: string) => useClinicalDelete('vitals', vitalService, pid)

// Conditions
export const useConditions = (pid: string) => useClinicalList('conditions', conditionService, pid)
export const useCreateCondition = (pid: string) => useClinicalCreate<ConditionCreate>('conditions', conditionService, pid)
export const useDeleteCondition = (pid: string) => useClinicalDelete('conditions', conditionService, pid)

// Allergies
export const useAllergies = (pid: string) => useClinicalList('allergies', allergyService, pid)
export const useCreateAllergy = (pid: string) => useClinicalCreate<AllergyCreate>('allergies', allergyService, pid)
export const useDeleteAllergy = (pid: string) => useClinicalDelete('allergies', allergyService, pid)

// Medications
export const useMedications = (pid: string) => useClinicalList('medications', medicationService, pid)
export const useCreateMedication = (pid: string) => useClinicalCreate<MedicationCreate>('medications', medicationService, pid)
export const useDeleteMedication = (pid: string) => useClinicalDelete('medications', medicationService, pid)

// Lab Results
export const useLabResults = (pid: string) => useClinicalList('labResults', labResultService, pid)
export const useCreateLabResult = (pid: string) => useClinicalCreate<LabResultCreate>('labResults', labResultService, pid)
export const useDeleteLabResult = (pid: string) => useClinicalDelete('labResults', labResultService, pid)

// Clinical Notes
export const useClinicalNotes = (pid: string) => useClinicalList('clinicalNotes', clinicalNoteService, pid)
export const useCreateClinicalNote = (pid: string) => useClinicalCreate<ClinicalNoteCreate>('clinicalNotes', clinicalNoteService, pid)

// ─── Documents ───────────────────────────────────────────────
export function useDocuments(patientId: string) {
  return useQuery({
    queryKey: ['documents', patientId],
    queryFn: () => documentService.list(patientId),
    enabled: !!patientId,
  })
}

export function useUploadDocument(patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { file: File; encounterId?: string; category?: string; description?: string }) =>
      documentService.upload(patientId, args.file, args.encounterId, args.category, args.description),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', patientId] }),
  })
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => documentService.get(id),
    enabled: !!id,
  })
}

export function useProcessDocument(patientId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => documentService.process(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      if (patientId) qc.invalidateQueries({ queryKey: ['documents', patientId] })
    },
  })
}

// ─── Workflows ───────────────────────────────────────────────
export function useWorkflows(patientId?: string) {
  return useQuery({
    queryKey: ['workflows', patientId],
    queryFn: () => workflowService.list(patientId),
  })
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: () => workflowService.get(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data
      return data && (data.status === 'running' || data.status === 'pending') ? 3000 : false
    },
  })
}

export function useAgentRuns(workflowId: string) {
  return useQuery({
    queryKey: ['agentRuns', workflowId],
    queryFn: () => workflowService.getAgentRuns(workflowId),
    enabled: !!workflowId,
    refetchInterval: 5000,
  })
}

export function useStartWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { patientId: string; encounterId?: string; config?: Record<string, unknown> }) =>
      workflowService.start(args.patientId, args.encounterId, args.config),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  })
}

// ─── Reports ─────────────────────────────────────────────────
export function useReport(id: string) {
  return useQuery({
    queryKey: ['report', id],
    queryFn: () => reportService.get(id),
    enabled: !!id,
  })
}

export function useReports(patientId?: string) {
  return useQuery({
    queryKey: ['reports', patientId],
    queryFn: () => reportService.list(patientId),
  })
}

export function useSubmitReview(reportId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ReportReviewCreate) => reportService.submitReview(reportId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report', reportId] })
      qc.invalidateQueries({ queryKey: ['reports'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// ─── Knowledge Base ──────────────────────────────────────────
export function useKnowledgeSources() {
  return useQuery({
    queryKey: ['knowledgeSources'],
    queryFn: knowledgeService.listSources,
  })
}

export function useKnowledgeDocuments(sourceId: string) {
  return useQuery({
    queryKey: ['knowledgeDocs', sourceId],
    queryFn: () => knowledgeService.listDocuments(sourceId),
    enabled: !!sourceId,
  })
}

// ─── System & Profile ────────────────────────────────────────
export function useSystemStatus() {
  return useQuery({
    queryKey: ['systemStatus'],
    queryFn: settingsService.getStatus,
    refetchInterval: 30000,
  })
}

export function useDoctorProfile() {
  return useQuery({
    queryKey: ['doctorProfile'],
    queryFn: settingsService.getProfile,
  })
}

export function useUpdateDoctorProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => settingsService.updateProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctorProfile'] })
    },
  })
}

export function useUpdateDoctorSpecialty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (specialty: string) => settingsService.updateSpecialty(specialty),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctorProfile'] })
    },
  })
}
