import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { usePatients } from '@/hooks/useApi'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, Button, Badge, Spinner } from '@/components/ui'
import {
  Sparkles,
  Upload,
  FileText,
  Pill,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Send,
  User,
  ShieldCheck,
  Stethoscope,
  X,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react'
import api from '@/lib/api'
import { medicationService, patientService } from '@/services/api'
import { formatDate, formatDateTime } from '@/lib/utils'

interface PrescriptionItem {
  id: string
  medication_name: string
  dosage: string
  frequency: string
  route: string
  duration: string
  instructions: string
}

export default function DiagnosticLabPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const initialPatientId = searchParams.get('patientId') || ''

  const rawDoctorName = user?.full_name || user?.username || 'Ashish'
  const doctorDisplayName = rawDoctorName.toLowerCase().startsWith('dr.') || rawDoctorName.toLowerCase().startsWith('dr ')
    ? rawDoctorName
    : `Dr. ${rawDoctorName}`
  const doctorSpecialty = user?.specialty || 'General'

  const { data: patientsData, isLoading: isPatientsLoading } = usePatients()
  const patients = Array.isArray(patientsData) ? patientsData : (patientsData as any)?.items || []

  // Target Patient Selection
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId)
  const [modality, setModality] = useState<'radiology_scan' | 'lab_report'>('radiology_scan')

  // Multi-File Upload State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({})

  // Execution & AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [analysisError, setAnalysisError] = useState('')

  // ─── Manual Multi-Medication Builder State (BLANK by default) ───
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([
    {
      id: '1',
      medication_name: '',
      dosage: '',
      frequency: 'Twice daily with meals',
      route: 'Oral (PO)',
      duration: '7–10 days',
      instructions: '',
    },
  ])
  const [isPrescriptionSaved, setIsPrescriptionSaved] = useState(false)
  const [isSavingPrescription, setIsSavingPrescription] = useState(false)
  const [prescriptionError, setPrescriptionError] = useState('')
  const [savedPrescriptionSummary, setSavedPrescriptionSummary] = useState<any[]>([])

  // Daily History Quick Drawer State
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historySummary, setHistorySummary] = useState<any>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update selected patient when query param or patients load
  useEffect(() => {
    if (initialPatientId && patients.length > 0) {
      const exists = patients.find((p: any) => p.id === initialPatientId)
      if (exists) setSelectedPatientId(initialPatientId)
    } else if (!selectedPatientId && patients.length > 0) {
      setSelectedPatientId(patients[0].id)
    }
  }, [initialPatientId, patients])

  const selectedPatient = patients.find((p: any) => p.id === selectedPatientId) || null

  // Load history summary whenever history modal opens
  const loadPatientDailyHistory = async () => {
    if (!selectedPatientId) return
    setIsLoadingHistory(true)
    try {
      const data = await patientService.getLongitudinalSummary(selectedPatientId)
      setHistorySummary(data)
      setShowHistoryModal(true)
    } catch (err) {
      console.error('Failed to load patient history:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // ─── Multi-File Upload Handlers ───
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      
      // Merge with existing files (prevent duplicates by name + size)
      const merged = [...selectedFiles]
      const newPreviews = { ...previewUrls }

      newFiles.forEach((file) => {
        const isDuplicate = merged.some((f) => f.name === file.name && f.size === file.size)
        if (!isDuplicate) {
          merged.push(file)
          if (file.type.startsWith('image/')) {
            newPreviews[`${file.name}_${file.size}`] = URL.createObjectURL(file)
          }
        }
      })

      setSelectedFiles(merged)
      setPreviewUrls(newPreviews)
      setAnalysisResult(null)
      setAnalysisError('')
      setIsPrescriptionSaved(false)
    }
  }

  const handleRemoveFile = (index: number) => {
    const fileToRemove = selectedFiles[index]
    if (fileToRemove) {
      const key = `${fileToRemove.name}_${fileToRemove.size}`
      const updatedPreviews = { ...previewUrls }
      delete updatedPreviews[key]
      setPreviewUrls(updatedPreviews)
    }
    const updated = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(updated)
    setAnalysisResult(null)
    if (updated.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClearAllFiles = () => {
    setSelectedFiles([])
    setPreviewUrls({})
    setAnalysisResult(null)
    setAnalysisError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ─── Multi-Medication Builder Handlers ───
  const handleAddMedicationRow = () => {
    setPrescriptions((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        medication_name: '',
        dosage: '',
        frequency: 'Twice daily with meals',
        route: 'Oral (PO)',
        duration: '7–10 days',
        instructions: '',
      },
    ])
  }

  const handleRemoveMedicationRow = (id: string) => {
    if (prescriptions.length === 1) {
      // If only 1, reset it to blank rather than empty array
      setPrescriptions([
        {
          id: Date.now().toString(),
          medication_name: '',
          dosage: '',
          frequency: 'Once daily',
          route: 'Oral (PO)',
          duration: '7 days',
          instructions: '',
        },
      ])
      return
    }
    setPrescriptions((prev) => prev.filter((p) => p.id !== id))
  }

  const handleUpdateMedicationField = (id: string, field: keyof PrescriptionItem, value: string) => {
    setPrescriptions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  const renderFormattedNote = (rawText: string) => {
    if (!rawText) return null
    const clean = rawText
      .replace(/\*{4,}/g, '**')
      .replace(/\*\*\s*\*\*/g, '')
      .replace(/ adult-year-old patient/g, ' adult patient')
      .trim()

    const lines = clean.split('\n')
    return (
      <div className="space-y-1.5 leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim()
          if (!trimmed) return <div key={idx} className="h-1" />
          const parts = trimmed.split(/(\*\*[^*]+\*\*)/g)
          return (
            <p key={idx} className={trimmed.startsWith('-') || trimmed.startsWith('•') ? 'ml-2' : ''}>
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  const inner = part.slice(2, -2).trim()
                  return (
                    <strong key={pIdx} className="font-bold text-gray-950">
                      {inner}
                    </strong>
                  )
                }
                return part
              })}
            </p>
          )
        })}
      </div>
    )
  }

  // Optional AI Suggestion Autofill (Doctor can voluntarily trigger)
  const handleAutofillAISuggestion = () => {
    if (!analysisResult) return
    const chatText = (analysisResult.chat_response || '').toLowerCase()
    const summaryText = (analysisResult.summary || '').toLowerCase()
    const combined = `${chatText} ${summaryText}`

    if (modality === 'lab_report' || combined.includes('procalcitonin') || combined.includes('crp') || combined.includes('sepsis') || combined.includes('leukocytosis')) {
      setPrescriptions([
        {
          id: '1',
          medication_name: 'Ceftriaxone',
          dosage: '2 g IV daily',
          frequency: 'Once daily IV infusion',
          route: 'Intravenous (IV)',
          duration: '48–72 hours pending culture',
          instructions: 'Administer over 30 mins. Draw blood cultures prior to first dose.',
        },
        {
          id: '2',
          medication_name: 'Intravenous Fluid Resuscitation (Plasmalyte/Normal Saline)',
          dosage: '30 mL/kg IV Crystalloids',
          frequency: 'Every 8 hours as indicated',
          route: 'Intravenous (IV)',
          duration: '24–48 hours',
          instructions: 'Serial blood pressure, urine output, and procalcitonin surveillance.',
        },
      ])
    } else if (combined.includes('cardiomegaly') || combined.includes('sternotomy')) {
      setPrescriptions([
        {
          id: '1',
          medication_name: 'Lisinopril',
          dosage: '10 mg oral daily',
          frequency: 'Once daily in the morning',
          route: 'Oral (PO)',
          duration: 'Ongoing maintenance',
          instructions: 'Take consistently with water. Monitor blood pressure weekly.',
        },
        {
          id: '2',
          medication_name: 'Atorvastatin',
          dosage: '20 mg oral bedtime',
          frequency: 'Once daily at bedtime',
          route: 'Oral (PO)',
          duration: 'Ongoing maintenance',
          instructions: 'Take at bedtime. Avoid grapefruit and grapefruit juice.',
        },
      ])
    } else {
      setPrescriptions([
        {
          id: '1',
          medication_name: 'Amoxicillin-Clavulanate (Augmentin)',
          dosage: '875/125 mg',
          frequency: 'Oral twice daily with meals',
          route: 'Oral (PO)',
          duration: '7–10 days',
          instructions: 'Complete full course with meals to prevent GI upset.',
        },
      ])
    }
  }

  // ─── Execution Handler (Upload All Files & Run Multimodal Inference) ───
  const handleRunAnalysis = async () => {
    if (!selectedPatientId) {
      setAnalysisError('Please select a patient first.')
      return
    }
    if (selectedFiles.length === 0) {
      setAnalysisError('Please attach at least one diagnostic scan or clinical report.')
      return
    }

    setIsAnalyzing(true)
    setAnalysisError('')
    setIsPrescriptionSaved(false)

    try {
      const uploadedDocIds: string[] = []

      // 1. Upload all attached files in parallel
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('category', modality === 'lab_report' ? 'clinical_laboratory' : 'radiology_scan')
        formData.append(
          'description',
          modality === 'lab_report'
            ? 'Clinical Laboratory Report & Biomarkers'
            : 'Diagnostic Thoracic Radiograph'
        )

        try {
          const uploadRes = await api.post(`/documents/upload/${selectedPatientId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          const docId = uploadRes.data?.id || uploadRes.data?.medical_file_id
          if (docId) uploadedDocIds.push(docId)
        } catch (ue) {
          console.warn(`File ${file.name} upload warning:`, ue)
        }
      }

      // 2. Execute Multimodal AI Analysis with BiomedCLIP + Groq 120B / RapidOCR
      const fileNamesList = selectedFiles.map((f) => f.name).join(', ')
      const chatRes = await api.post('/encounters/chat', {
        patient_id: selectedPatientId,
        document_ids: uploadedDocIds,
        prompt:
          modality === 'lab_report'
            ? `Comprehensive Clinical Laboratory Analysis for [${fileNamesList}]. Analyze inflammatory markers (CRP, Procalcitonin, WBC), differential, renal function, glucose, and systemic infection risks. Formulate diagnostic SOAP note and targeted pharmaceutical/antimicrobial stewardship plan.`
            : `Clinical radiological evaluation for [${fileNamesList}]. Analyze cardiothoracic ratio, pulmonary parenchyma, and surgical hardware.`,
        specialty: modality === 'lab_report' ? 'Internal Medicine' : 'Radiology',
        category: modality === 'lab_report' ? 'clinical_laboratory' : 'radiology_scan',
        modality: modality,
        title: `Multimodal Analysis: ${selectedFiles[0]?.name || 'Clinical Document'}`,
      })

      const data = chatRes.data
      setAnalysisResult(data)

      // NOTE: Prescriptions are intentionally LEFT BLANK as requested by user!
      // Doctor can manually prescribe any medicines they wish.
    } catch (err: any) {
      console.error('Analysis error:', err)
      setAnalysisError(err?.response?.data?.detail || err.message || 'AI analysis execution failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // ─── Save All Prescriptions to Database & Patient Portal ───
  const handleSavePrescriptions = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatientId) {
      setPrescriptionError('Target patient is required.')
      return
    }

    const validMedications = prescriptions.filter((p) => p.medication_name.trim().length > 0)
    if (validMedications.length === 0) {
      setPrescriptionError('Please enter at least one medication name.')
      return
    }

    setIsSavingPrescription(true)
    setPrescriptionError('')

    try {
      // Call batch medication creation endpoint
      const batchPayload = validMedications.map((m) => ({
        medication_name: m.medication_name.trim(),
        dosage: m.dosage.trim() || 'As directed',
        frequency: m.frequency.trim() || 'Daily',
        route: m.route.trim() || 'Oral',
        duration: m.duration.trim() || '',
        instructions: m.instructions.trim() || 'Take as directed by physician.',
      }))

      const res = await medicationService.createBatch(selectedPatientId, batchPayload)
      setSavedPrescriptionSummary(validMedications)
      setIsPrescriptionSaved(true)
    } catch (err: any) {
      console.error('Save prescription error:', err)
      setPrescriptionError(err?.response?.data?.detail || err.message || 'Failed to save prescriptions')
    } finally {
      setIsSavingPrescription(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        title="AI Diagnostic Lab & Reports"
        description="Multimodal Perception Engine (BiomedCLIP + VisionProjector + Groq 120B)"
      />

      {/* ─── Step 1 & Step 2 Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Patient Selection Card */}
        <Card className="rounded-2xl border border-gray-200/90 shadow-xs">
          <CardHeader className="pb-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <span>1. Select Patient</span>
            </h3>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {isPatientsLoading ? (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : patients.length > 0 ? (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Target Patient Roster
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => {
                    setSelectedPatientId(e.target.value)
                    setIsPrescriptionSaved(false)
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 font-medium focus:border-blue-500 focus:outline-none cursor-pointer"
                >
                  {patients.map((p: any) => {
                    const name = p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim()
                    const id = p.patient_identifier || p.medical_record_number || p.id
                    return (
                      <option key={p.id} value={p.id}>
                        {name} ({id})
                      </option>
                    )
                  })}
                </select>

                {selectedPatient && (
                  <div className="mt-3 rounded-xl bg-blue-50/70 p-3.5 border border-blue-100 text-xs text-blue-950 space-y-2">
                    <div>
                      <p className="font-semibold text-sm">
                        {selectedPatient.full_name || `${selectedPatient.first_name || ''} ${selectedPatient.last_name || ''}`.trim()}
                      </p>
                      <p className="text-[11px] text-gray-600 font-mono mt-0.5">
                        MRN: {selectedPatient.patient_identifier || selectedPatient.medical_record_number} • {selectedPatient.gender || selectedPatient.sex || 'Male'}
                      </p>
                      <p className="text-[11px] text-gray-600">
                        Dept: <strong className="text-blue-800">{selectedPatient.specialty || 'General'}</strong>
                      </p>
                    </div>

                    {/* Quick Button to View Patient Longitudinal History */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={loadPatientDailyHistory}
                        disabled={isLoadingHistory}
                        className="flex items-center justify-center gap-1 rounded-lg bg-white border border-blue-200 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 transition shadow-2xs cursor-pointer"
                      >
                        {isLoadingHistory ? (
                          <Spinner size="sm" />
                        ) : (
                          <>
                            <Calendar className="h-3.5 w-3.5 text-blue-600" />
                            <span>Daily History</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/patients/${selectedPatient.id}`)}
                        className="flex items-center justify-center gap-1 rounded-lg bg-blue-600 text-white py-1.5 text-[11px] font-semibold hover:bg-blue-700 transition shadow-2xs cursor-pointer"
                      >
                        <span>Full Profile</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No patients registered. Please add a patient first.</p>
            )}
          </CardContent>
        </Card>

        {/* ─── Step 2: Multi-File Upload & Modality Selection ─── */}
        <Card className="md:col-span-2 rounded-2xl border border-gray-200/90 shadow-xs">
          <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Upload className="h-4 w-4 text-blue-600" />
              <span>2. Select Modality & Upload Documents</span>
            </h3>
            <span className="text-[11px] font-medium text-gray-400">
              Modality: <strong className="text-blue-700">{modality === 'lab_report' ? 'Clinical Lab Report' : 'Diagnostic Scan'}</strong>
            </span>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Modality Dropdown & Visual Cards */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
                <span>Select Document Type / Diagnostic Modality</span>
              </label>

              <div className="mb-3">
                <select
                  value={modality}
                  onChange={(e) => {
                    setModality(e.target.value as 'radiology_scan' | 'lab_report')
                    setAnalysisResult(null)
                  }}
                  className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs font-bold text-gray-900 shadow-2xs focus:border-blue-600 focus:outline-none cursor-pointer"
                >
                  <option value="radiology_scan">🔬 Diagnostic Scan / Radiology (Chest X-Ray, CT Scan, Thoracic Scan, CTR)</option>
                  <option value="lab_report">📋 Clinical Laboratory Report (Blood Work, CBC, CRP, Procalcitonin, Sepsis)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModality('radiology_scan')
                    setAnalysisResult(null)
                  }}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                    modality === 'radiology_scan'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-2xs ring-1 ring-blue-500'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${modality === 'radiology_scan' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-gray-900">Diagnostic Scan / Radiology</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                      Chest X-Ray, CT Scan, Thoracic Radiography, Hardware & Cardiothoracic ratio
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModality('lab_report')
                    setAnalysisResult(null)
                  }}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                    modality === 'lab_report'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-2xs ring-1 ring-blue-500'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${modality === 'lab_report' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-gray-900">Clinical Laboratory Report</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                      Blood Work, CBC, CRP, Procalcitonin, Glucose, BUN, Sepsis & Biomarkers
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Hidden Multi-file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept=".jpg,.jpeg,.png,.dcm,.pdf,.txt"
              className="hidden"
            />

            {/* Drag & Drop or Selected Files Grid */}
            {selectedFiles.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 p-7 text-center hover:border-blue-500 hover:bg-blue-50/30 transition cursor-pointer"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3 shadow-2xs">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  {modality === 'lab_report'
                    ? 'Click or drag Clinical Laboratory Reports here'
                    : 'Click or drag Diagnostic Radiographs / Scans here'}
                </p>
                <p className="text-xs text-blue-600 font-semibold mt-1">
                  ✨ Multi-File Upload Supported: Select one or multiple images/PDFs at once
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Supports JPEG, PNG, DICOM (.dcm), and clinical laboratory PDF files
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Selected Files for Multimodal Inference ({selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''})</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add More Files</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllFiles}
                      className="text-xs font-medium text-red-600 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Grid of Attached Files */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
                  {selectedFiles.map((file, idx) => {
                    const previewKey = `${file.name}_${file.size}`
                    const previewSrc = previewUrls[previewKey]

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/80 p-2.5 text-xs shadow-2xs hover:bg-white transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {previewSrc ? (
                            <img
                              src={previewSrc}
                              alt="Scan Preview"
                              className="h-10 w-10 rounded-lg object-cover border border-gray-200 shrink-0"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold text-[10px]">
                              DOC
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate max-w-[150px] sm:max-w-[180px]">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {(file.size / 1024).toFixed(1)} KB • Ready
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600 transition cursor-pointer shrink-0"
                          title="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Run Analysis Action Button */}
            <div className="mt-4 flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-[11px] text-gray-400">
                Engine: Microsoft BiomedCLIP + BioMistral Projectors + Groq 120B
              </span>
              <Button
                onClick={handleRunAnalysis}
                disabled={selectedFiles.length === 0 || isAnalyzing}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-6 font-semibold"
              >
                {isAnalyzing ? (
                  <>
                    <Spinner size="sm" />
                    <span>Analyzing {selectedFiles.length} Document{selectedFiles.length > 1 ? 's' : ''}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Run AI Analysis ({selectedFiles.length || 0})</span>
                  </>
                )}
              </Button>
            </div>

            {analysisError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{analysisError}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── AI Analysis Results Display ─── */}
      {analysisResult && (
        <Card className="rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-4 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Multimodal Diagnostic Findings & Clinical Note
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    Patient: {selectedPatient?.full_name} • Attending: {doctorDisplayName}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-blue-200 border-blue-400/30 bg-white/5 text-xs">
                RapidOCR + BioMistral + Groq 120B
              </Badge>
            </div>
          </div>

          <CardContent className="p-6 space-y-5">
            {/* Structured SOAP Clinical Note */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Structured Clinical Note (SOAP)
              </h4>
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 text-xs text-gray-800 leading-relaxed font-sans">
                {renderFormattedNote(analysisResult.soap_note || analysisResult.chat_response || 'No SOAP note generated.')}
              </div>
            </div>

            {/* Diagnostic Summary & Findings */}
            {analysisResult.summary && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Diagnostic Summary & Findings
                </h4>
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 text-xs text-blue-950 leading-relaxed font-sans">
                  {renderFormattedNote(analysisResult.summary)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Step 3: Manual Multi-Medication Builder (BLANK BY DEFAULT) ─── */}
      <Card className="rounded-2xl border border-gray-200/90 shadow-xs">
        <CardHeader className="pb-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Pill className="h-4 w-4 text-blue-600" />
              <span>3. Doctor Prescription & Medication Regimen (Manual Entry)</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Prescribe one or multiple medications with custom dosage, route, and frequency. Prescriptions upload to the Patient Portal automatically.
            </p>
          </div>

          {/* Optional AI Suggestions Helper */}
          {analysisResult && (
            <button
              type="button"
              onClick={handleAutofillAISuggestion}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition cursor-pointer self-start sm:self-auto"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              <span>Autofill AI Suggestion</span>
            </button>
          )}
        </CardHeader>

        <CardContent className="p-5">
          {isPrescriptionSaved ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-2xs">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-emerald-900">
                Prescriptions Successfully Issued & Uploaded to Patient Portal!
              </h4>
              <p className="text-xs text-emerald-800 max-w-lg mx-auto">
                {savedPrescriptionSummary.length} medication{savedPrescriptionSummary.length > 1 ? 's' : ''} have been officially assigned to{' '}
                <strong>{selectedPatient?.full_name}</strong>. They are now live on the Patient Portal timeline and the Medications registry.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {savedPrescriptionSummary.map((med, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 border border-emerald-300/60 px-2.5 py-1 text-xs font-bold text-emerald-900"
                  >
                    💊 {med.medication_name} ({med.dosage})
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-center gap-3 pt-3">
                <Button
                  onClick={() => navigate(`/medications?patientId=${selectedPatientId}`)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                >
                  View in Medications Tab
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPrescriptionSaved(false)
                    setPrescriptions([
                      {
                        id: Date.now().toString(),
                        medication_name: '',
                        dosage: '',
                        frequency: 'Twice daily with meals',
                        route: 'Oral (PO)',
                        duration: '7–10 days',
                        instructions: '',
                      },
                    ])
                  }}
                  className="text-xs font-semibold"
                >
                  Prescribe More Medications
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSavePrescriptions} className="space-y-5">
              {prescriptionError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{prescriptionError}</span>
                </div>
              )}

              {/* Medication Rows List */}
              <div className="space-y-4">
                {prescriptions.map((rx, idx) => (
                  <div
                    key={rx.id}
                    className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 space-y-3 relative transition hover:border-gray-300"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <Pill className="h-3.5 w-3.5 text-blue-600" />
                        <span>Medication #{idx + 1}</span>
                      </span>

                      {prescriptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicationRow(rx.id)}
                          className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Row Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Name */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Medication Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={rx.medication_name}
                          onChange={(e) => handleUpdateMedicationField(rx.id, 'medication_name', e.target.value)}
                          placeholder="e.g. Amoxicillin-Clavulanate, Ceftriaxone, Lisinopril..."
                          className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                        />
                      </div>

                      {/* Dosage */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Dosage *
                        </label>
                        <input
                          type="text"
                          required
                          value={rx.dosage}
                          onChange={(e) => handleUpdateMedicationField(rx.id, 'dosage', e.target.value)}
                          placeholder="e.g. 500 mg, 875/125 mg, 10 mg..."
                          className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      {/* Route */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Route *
                        </label>
                        <select
                          value={rx.route}
                          onChange={(e) => handleUpdateMedicationField(rx.id, 'route', e.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none cursor-pointer"
                        >
                          <option value="Oral (PO)">Oral (PO)</option>
                          <option value="Intravenous (IV)">Intravenous (IV)</option>
                          <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                          <option value="Subcutaneous (SubQ)">Subcutaneous (SubQ)</option>
                          <option value="Inhalation">Inhalation</option>
                          <option value="Topical">Topical</option>
                          <option value="Sublingual">Sublingual</option>
                        </select>
                      </div>

                      {/* Frequency */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Frequency *
                        </label>
                        <select
                          value={rx.frequency}
                          onChange={(e) => handleUpdateMedicationField(rx.id, 'frequency', e.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none cursor-pointer"
                        >
                          <option value="Once daily (QD)">Once daily (QD)</option>
                          <option value="Twice daily with meals (BID)">Twice daily with meals (BID)</option>
                          <option value="Three times daily (TID)">Three times daily (TID)</option>
                          <option value="Four times daily (QID)">Four times daily (QID)</option>
                          <option value="Every 8 hours (q8h)">Every 8 hours (q8h)</option>
                          <option value="Every 12 hours (q12h)">Every 12 hours (q12h)</option>
                          <option value="Once daily at bedtime (QHS)">Once daily at bedtime (QHS)</option>
                          <option value="As needed for pain/fever (PRN)">As needed for pain/fever (PRN)</option>
                        </select>
                      </div>

                      {/* Duration */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Duration
                        </label>
                        <input
                          type="text"
                          value={rx.duration}
                          onChange={(e) => handleUpdateMedicationField(rx.id, 'duration', e.target.value)}
                          placeholder="e.g. 5 days, 7-10 days, Ongoing maintenance..."
                          className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      {/* Instructions */}
                      <div className="col-span-1 sm:col-span-2 md:col-span-4">
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Clinical Instructions & Patient Directions
                        </label>
                        <input
                          type="text"
                          value={rx.instructions}
                          onChange={(e) => handleUpdateMedicationField(rx.id, 'instructions', e.target.value)}
                          placeholder="e.g. Take with food. Complete full course. Return if high fever occurs."
                          className="w-full rounded-xl border border-gray-200 bg-white p-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Another Medicine Button */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleAddMedicationRow}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100/70 transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Add Another Medicine</span>
                </button>

                <p className="text-[11px] text-gray-400">
                  Total Medicines to Issue: <strong>{prescriptions.length}</strong>
                </p>
              </div>

              {/* Prescribing Physician & Submit Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-gray-100 gap-3">
                <div className="text-[11px] text-gray-500">
                  Prescribing Physician: <strong className="text-gray-900">{doctorDisplayName} ({doctorSpecialty})</strong>
                  <p className="text-[10px] text-emerald-600">
                    ⚡ Automatically syncs to Patient Portal upon submission
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isSavingPrescription || !prescriptions.some((p) => p.medication_name.trim())}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 px-7 font-bold shadow-sm"
                >
                  {isSavingPrescription ? (
                    <>
                      <Spinner size="sm" />
                      <span>Saving {prescriptions.length} Prescriptions...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Save & Issue {prescriptions.length > 1 ? `All ${prescriptions.length} Prescriptions` : 'Prescription'}</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* ─── Drawer/Modal: Patient Daily Longitudinal History Summary ─── */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-blue-950 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar className="h-5 w-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Patient Daily Care & Reports History Summary
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    {selectedPatient?.full_name} • Grouped by Calendar Checkup Day
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="rounded-lg p-1.5 text-gray-300 hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              {historySummary?.days && historySummary.days.length > 0 ? (
                historySummary.days.map((day: any, i: number) => (
                  <div
                    key={i}
                    className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-[10px] font-bold">
                          {day.day_number || `Visit Day ${i + 1}`}
                        </Badge>
                        <span className="font-bold text-gray-900 text-sm">{day.display_date}</span>
                      </div>
                      <span className="text-[11px] text-gray-500">
                        {day.interactions_count} Encounter/Session(s) Unified
                      </span>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                      <p className="font-bold text-blue-900 text-xs mb-1">Daily Care Summary:</p>
                      <p className="text-gray-700 leading-relaxed">{day.summary_narrative}</p>
                    </div>

                    {/* Prescriptions issued on that day */}
                    {day.prescriptions_issued && day.prescriptions_issued.length > 0 && (
                      <div>
                        <p className="font-bold text-gray-700 text-[11px] mb-1">Medications Issued/Maintained:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {day.prescriptions_issued.map((m: any, mi: number) => (
                            <span
                              key={mi}
                              className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold"
                            >
                              💊 {m.name || m.medication_name} ({m.dosage})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No historical checkup summaries found for this patient yet.
                </p>
              )}
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end">
              <Button onClick={() => setShowHistoryModal(false)} className="text-xs">
                Close Summary
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
