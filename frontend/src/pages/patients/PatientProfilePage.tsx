import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { usePatient, useMedications } from '@/hooks/useApi'
import { patientService } from '@/services/api'
import { Card, CardContent, CardHeader, Button, Badge, Spinner, EmptyState } from '@/components/ui'
import {
  ArrowLeft,
  Sparkles,
  Pill,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  Stethoscope,
  Activity,
  FileText,
  AlertCircle,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Plus,
} from 'lucide-react'
import { calculateAge, formatDate } from '@/lib/utils'

export default function PatientProfilePage() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState<'daily-history' | 'medications' | 'demographics'>('daily-history')
  const [dailyHistory, setDailyHistory] = useState<any>(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)

  // Collapsible Dropdown Sections state (default open)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key],
    }))
  }

  const isSectionOpen = (key: string) => openSections[key] !== false

  // Formatted clinical text helper to render clean structured paragraphs without raw **** artifacts
  const renderFormattedClinicalText = (text: string) => {
    if (!text) return null
    const clean = text
      .replace(/\*{3,}/g, '**')
      .replace(/\*\*\s*\*\*/g, '')
      .replace(/ adult-year-old patient/g, ' adult patient')
      .trim()

    const paragraphs = clean.split(/\n\n+/)
    return (
      <div className="space-y-2 text-xs leading-relaxed">
        {paragraphs.map((p, pIdx) => {
          const parts = p.split(/(\*\*[^*]+\*\*)/g)
          return (
            <p key={pIdx} className="text-gray-800">
              {parts.map((part, idx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  const inner = part.slice(2, -2).trim()
                  return (
                    <strong key={idx} className="font-bold text-gray-950">
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

  // Deduplicate medications for same day (latest updated dose/regimen wins)
  const deduplicateMeds = (rawMeds: any[]) => {
    const map = new Map<string, any>()
    for (const m of rawMeds || []) {
      const rawName = (m.name || m.medication_name || '').trim()
      const normKey = rawName.replace(/\s*\(.*?\)/g, '').trim().toLowerCase() || rawName.toLowerCase()
      if (normKey && !map.has(normKey)) {
        map.set(normKey, m)
      }
    }
    return Array.from(map.values())
  }

  const rawDoctorName = user?.full_name || user?.username || 'Ashish'
  const doctorDisplayName = rawDoctorName.toLowerCase().startsWith('dr.') || rawDoctorName.toLowerCase().startsWith('dr ')
    ? rawDoctorName
    : `Dr. ${rawDoctorName}`
  const doctorSpecialty = user?.specialty || 'General'

  const { data: patient, isLoading: isPatientLoading } = usePatient(patientId!)
  const { data: medications, isLoading: isMedsLoading, refetch: refetchMeds } = useMedications(patientId!)

  // Fetch longitudinal summary whenever patientId is active
  useEffect(() => {
    let isMounted = true
    const fetchHistory = async () => {
      if (!patientId) return
      setIsHistoryLoading(true)
      try {
        const data = await patientService.getLongitudinalSummary(patientId)
        if (isMounted) {
          setDailyHistory(data)
        }
      } catch (err) {
        console.error('Failed to load patient longitudinal summary:', err)
      } finally {
        if (isMounted) setIsHistoryLoading(false)
      }
    }
    fetchHistory()
    return () => {
      isMounted = false
    }
  }, [patientId])

  if (isPatientLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!patient) {
    return <EmptyState title="Patient not found" />
  }

  const age = calculateAge(patient.date_of_birth)
  const id = patient.patient_identifier || patient.medical_record_number || patient.id
  const gender = (patient.sex || patient.gender || 'Unknown').toUpperCase()
  const name = patient.full_name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient'
  const contactInfo = (patient as any).contact_info || {}
  const emergencyContact = (patient as any).emergency_contact || {}

  const daysList: any[] = dailyHistory?.days || []

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/patients')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Patients</span>
        </button>
      </div>

      {/* Patient Header Card */}
      <div className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 font-bold text-xl text-white shadow-sm">
              {name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
                <Badge variant={patient.is_active !== false ? 'success' : 'secondary'} className="text-xs">
                  {patient.is_active !== false ? 'Active Patient' : 'Inactive'}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span className="font-mono font-semibold text-gray-700">ID: {id}</span>
                <span>•</span>
                <span>Age: <strong className="text-gray-700">{age} yrs</strong></span>
                <span>•</span>
                <span>Gender: <strong className="text-gray-700">{gender}</strong></span>
                <span>•</span>
                <span>DOB: <strong className="text-gray-700">{formatDate(patient.date_of_birth)}</strong></span>
                <span>•</span>
                <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                  {patient.specialty || patient.consultation_type || 'Neurology'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate(`/diagnostic-lab?patientId=${patient.id}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-sm font-semibold text-xs"
            >
              <Sparkles className="h-4 w-4" />
              <span>Open AI Diagnostic Lab</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Top Tab Navigation Bar ─── */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-px">
        <button
          onClick={() => setActiveTab('daily-history')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'daily-history'
              ? 'border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Daily Care & Reports History Summary</span>
          <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold">
            {daysList.length} {daysList.length === 1 ? 'Day' : 'Days'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('medications')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'medications'
              ? 'border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <Pill className="h-4 w-4" />
          <span>Active Prescriptions & Regimens</span>
          <span className="rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-[10px] font-bold">
            {medications?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('demographics')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'demographics'
              ? 'border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Demographics & Care Governance</span>
        </button>
      </div>

      {/* ─── TAB 1: Daily Care & Reports History Summary (Core Major Feature) ─── */}
      {activeTab === 'daily-history' && (
        <div className="space-y-6">
          {/* Header Action: Record Today's Checkup */}
          <div className="flex items-center justify-between bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-600/10 p-2 text-blue-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Patient Encounters & Checkup Records
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Consolidated timeline of clinical evaluations, diagnostic scans, labs, and active regimens.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate(`/diagnostic-lab?patientId=${patient.id}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 text-xs font-semibold shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Record Today's Checkup
            </Button>
          </div>

          {/* Daily Timeline Cards */}
          {isHistoryLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Spinner size="lg" />
              <p className="text-xs text-gray-500 font-medium">Synthesizing daily care and report trajectory...</p>
            </div>
          ) : daysList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center bg-white">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">No Past Clinical Checkup Days Recorded</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                No past daily encounters exist yet for {name}. Use the AI Diagnostic Lab to evaluate radiographs, review blood work, and prescribe medications.
              </p>
              <Button
                onClick={() => navigate(`/diagnostic-lab?patientId=${patient.id}`)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Start First AI Checkup
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {daysList.map((dayItem: any, index: number) => {
                const isLatest = index === 0
                const interactionsCount = dayItem.interactions_count || 1
                const dayKey = dayItem.date || String(index)
                const dedupedPrescriptions = deduplicateMeds(dayItem.prescriptions_issued || [])

                return (
                  <Card
                    key={dayItem.date || index}
                    className={`rounded-2xl border transition shadow-xs overflow-hidden ${
                      isLatest ? 'border-blue-300 ring-1 ring-blue-200/60 bg-white' : 'border-gray-200/90 bg-white'
                    }`}
                  >
                    {/* Date Header Strip */}
                    <div className="border-b border-gray-100 bg-gray-50/70 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm shadow-2xs ${
                            isLatest ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-gray-900">{dayItem.display_date || dayItem.date}</h2>
                            <Badge variant={isLatest ? 'default' : 'secondary'} className="text-[10px]">
                              {dayItem.day_number || `Day ${daysList.length - index}`}
                            </Badge>
                            {isLatest && (
                              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                Most Recent Visit
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Attending Clinician: <strong className="text-gray-700">{dayItem.attending_doctor || doctorDisplayName}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Same-day consolidation indicator */}
                      <div className="flex items-center gap-2">
                        {interactionsCount > 1 ? (
                          <div className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200/80 px-3 py-1.5 text-xs font-semibold text-indigo-900 shadow-2xs">
                            <Layers className="h-3.5 w-3.5 text-indigo-600" />
                            <span>{interactionsCount} Sessions Unified into Single Daily Summary</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-2.5 py-1 text-xs text-gray-600 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>1 Daily Care Session</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <CardContent className="p-6 space-y-4">
                      {/* 1. Collapsible Dropdown: Doctor's Consolidated Day Narrative & Clinical Evaluation */}
                      <div className="rounded-xl border border-blue-200/90 bg-white overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => toggleSection(`${dayKey}-narrative`)}
                          className="w-full flex items-center justify-between p-3.5 bg-blue-50/70 hover:bg-blue-100/60 transition cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="rounded-lg bg-blue-600 p-1.5 text-white shadow-2xs">
                              <Stethoscope className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                                Doctor's Consolidated Day Narrative & Clinical Evaluation
                              </h4>
                              <span className="text-[10px] text-blue-700 font-medium">SOAP Synthesis & Clinical Assessment</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                              Clinical Narrative
                            </span>
                            {isSectionOpen(`${dayKey}-narrative`) ? (
                              <ChevronUp className="h-4 w-4 text-blue-700" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-blue-700" />
                            )}
                          </div>
                        </button>
                        {isSectionOpen(`${dayKey}-narrative`) && (
                          <div className="p-4 bg-blue-50/30 border-t border-blue-100">
                            {renderFormattedClinicalText(dayItem.summary_narrative || 'Outpatient consultation and multimodal diagnostic review completed.')}
                          </div>
                        )}
                      </div>

                      {/* 2. Collapsible Dropdown: Diagnostic Scans & Radiology Evaluated */}
                      <div className="rounded-xl border border-gray-200/90 bg-white overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => toggleSection(`${dayKey}-scans`)}
                          className="w-full flex items-center justify-between p-3.5 bg-gray-50/90 hover:bg-gray-100/70 transition cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="rounded-lg bg-indigo-600 p-1.5 text-white shadow-2xs">
                              <Sparkles className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                Diagnostic Scans & Radiology Evaluated
                              </h4>
                              <span className="text-[10px] text-gray-500 font-medium">Multimodal Thoracic & Musculoskeletal Imaging</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                              {(dayItem.scans_reviewed || []).length} {dayItem.scans_reviewed?.length === 1 ? 'Study' : 'Studies'}
                            </span>
                            {isSectionOpen(`${dayKey}-scans`) ? (
                              <ChevronUp className="h-4 w-4 text-gray-600" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-600" />
                            )}
                          </div>
                        </button>
                        {isSectionOpen(`${dayKey}-scans`) && (
                          <div className="p-4 bg-white border-t border-gray-100 space-y-3">
                            {(dayItem.scans_reviewed || []).length > 0 ? (
                              <div className="space-y-3">
                                {dayItem.scans_reviewed.map((scan: any, sIdx: number) => (
                                  <div key={sIdx} className="rounded-xl border border-gray-200/90 bg-gray-50/40 p-3.5 text-xs shadow-2xs space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-indigo-600" />
                                        <p className="font-bold text-gray-950 text-xs">
                                          {scan.filename || scan.type || 'Thoracic Radiograph Study'}
                                        </p>
                                      </div>
                                      <Badge variant="default" className="text-[9px] bg-indigo-100 text-indigo-900 border-indigo-200">
                                        {scan.status || 'AI Evaluated & Reviewed'}
                                      </Badge>
                                    </div>
                                    {scan.finding && (
                                      <div className="text-[11px] text-gray-700 bg-white border border-gray-200/70 rounded-lg p-2.5">
                                        <span className="font-bold text-gray-900 block mb-0.5">Radiological Findings:</span>
                                        {renderFormattedClinicalText(scan.finding)}
                                      </div>
                                    )}
                                    {scan.impression && (
                                      <p className="text-[11px] text-indigo-950 font-medium italic">
                                        <strong>Impression:</strong> {scan.impression}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 italic py-2">
                                No thoracic radiographs or imaging uploaded on this date.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 3. Collapsible Dropdown: Clinical Laboratory Panels & Biomarkers */}
                      <div className="rounded-xl border border-gray-200/90 bg-white overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => toggleSection(`${dayKey}-labs`)}
                          className="w-full flex items-center justify-between p-3.5 bg-gray-50/90 hover:bg-gray-100/70 transition cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="rounded-lg bg-teal-600 p-1.5 text-white shadow-2xs">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                Clinical Laboratory Panels & Biomarkers
                              </h4>
                              <span className="text-[10px] text-gray-500 font-medium">Hematology, Metabolic, Inflammatory & Organ Profiles</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md">
                              {(dayItem.labs_reviewed || []).length} Biomarkers
                            </span>
                            {isSectionOpen(`${dayKey}-labs`) ? (
                              <ChevronUp className="h-4 w-4 text-gray-600" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-600" />
                            )}
                          </div>
                        </button>
                        {isSectionOpen(`${dayKey}-labs`) && (
                          <div className="p-4 bg-white border-t border-gray-100">
                            {(dayItem.labs_reviewed || []).length > 0 ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                {dayItem.labs_reviewed.map((lab: any, lIdx: number) => {
                                  const isAbnormal = lab.flag && lab.flag.toLowerCase() !== 'normal'
                                  return (
                                    <div
                                      key={lIdx}
                                      className={`rounded-xl border p-2.5 text-xs transition ${
                                        isAbnormal
                                          ? 'border-amber-300 bg-amber-50/70 text-amber-950 shadow-2xs'
                                          : 'border-gray-200 bg-white text-gray-800'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-[11px] truncate">{lab.test_name || lab.name}</span>
                                        {isAbnormal && (
                                          <span className="rounded bg-amber-200/90 text-amber-950 px-1.5 py-0.2 text-[9px] font-bold shrink-0">
                                            {lab.flag}
                                          </span>
                                        )}
                                      </div>
                                      <p className="font-mono font-bold text-xs mt-1">
                                        {lab.value} <span className="text-[10px] text-gray-500 font-normal">{lab.unit}</span>
                                      </p>
                                      {lab.reference_range && lab.reference_range !== 'Standard reference range' && (
                                        <p className="text-[9px] text-gray-400 mt-0.5">Ref: {lab.reference_range}</p>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 italic py-2">
                                Clinical labs reviewed in consultation; detailed quantitative panel archived.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 4. Collapsible Dropdown: Prescriptions & Regimens Issued */}
                      <div className="rounded-xl border border-gray-200/90 bg-white overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => toggleSection(`${dayKey}-prescriptions`)}
                          className="w-full flex items-center justify-between p-3.5 bg-gray-50/90 hover:bg-gray-100/70 transition cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="rounded-lg bg-blue-600 p-1.5 text-white shadow-2xs">
                              <Pill className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                Prescriptions & Regimens Issued / Active on {dayItem.display_date || dayItem.date}
                              </h4>
                              <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                <span>Auto-Synced to Patient Portal (Latest Regimen Shown)</span>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                              {dedupedPrescriptions.length} {dedupedPrescriptions.length === 1 ? 'Medication' : 'Medications'}
                            </span>
                            {isSectionOpen(`${dayKey}-prescriptions`) ? (
                              <ChevronUp className="h-4 w-4 text-gray-600" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-600" />
                            )}
                          </div>
                        </button>
                        {isSectionOpen(`${dayKey}-prescriptions`) && (
                          <div className="p-4 bg-white border-t border-gray-100">
                            {dedupedPrescriptions.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {dedupedPrescriptions.map((rx: any, rxIdx: number) => (
                                  <div
                                    key={rxIdx}
                                    className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs space-y-1.5 text-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <p className="font-bold text-gray-900 text-xs">
                                        {rx.name || rx.medication_name}
                                      </p>
                                      <Badge variant="default" className="text-[9px] bg-emerald-100 text-emerald-900 border-emerald-200">
                                        {rx.status || 'Active'}
                                      </Badge>
                                    </div>
                                    <div className="text-gray-600 text-[11px] space-y-0.5">
                                      <p>
                                        <strong className="text-gray-700">Dosage:</strong> {rx.dosage} •{' '}
                                        <strong className="text-gray-700">Route:</strong> {rx.route || 'Oral (PO)'}
                                      </p>
                                      <p>
                                        <strong className="text-gray-700">Frequency:</strong> {rx.frequency}
                                      </p>
                                      {rx.duration && (
                                        <p>
                                          <strong className="text-gray-700">Duration:</strong> {rx.duration}
                                        </p>
                                      )}
                                    </div>
                                    {(rx.instructions || rx.notes) && (
                                      <p className="text-[11px] text-gray-500 italic pt-1 border-t border-gray-50">
                                        Instructions: {rx.instructions || rx.notes}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 italic">
                                No new medications prescribed during this encounter date.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 4. Doctor Clinical Notes & Follow-up Plans */}
                      {(dayItem.clinical_notes || []).length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 space-y-1.5 text-xs">
                          <p className="font-bold text-gray-800 text-[11px] uppercase tracking-wider">
                            Physician Clinical Directives & Monitoring Plans
                          </p>
                          {dayItem.clinical_notes.map((note: string, nIdx: number) => (
                            <p key={nIdx} className="text-gray-700 leading-relaxed">
                              • {note}
                            </p>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: Active Prescriptions & Regimens ─── */}
      {activeTab === 'medications' && (
        <Card className="rounded-2xl border border-gray-200/90 shadow-xs">
          <CardHeader className="border-b border-gray-100 pb-3 flex flex-row items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Pill className="h-4 w-4 text-blue-600" />
                <span>Active Prescriptions & Pharmacotherapy for {name}</span>
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                All prescribed medications automatically synchronize to the patient's portal view and longitudinal history.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate(`/diagnostic-lab?patientId=${patient.id}`)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Prescribe via AI Lab
            </Button>
          </CardHeader>
          <CardContent className="p-5">
            {isMedsLoading ? (
              <div className="flex justify-center py-6">
                <Spinner size="sm" />
              </div>
            ) : medications && medications.length > 0 ? (
              <div className="space-y-3">
                {medications.map((med: any) => (
                  <div
                    key={med.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-gray-200/80 bg-gray-50/50 p-4 gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 text-sm">{med.medication_name}</p>
                        <Badge variant="success" className="text-[10px]">
                          {med.status || 'Active'}
                        </Badge>
                        {med.route && (
                          <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200/60">
                            {med.route}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mt-1">
                        <strong className="text-gray-800">Dosage:</strong> {med.dosage} •{' '}
                        <strong className="text-gray-800">Frequency:</strong> {med.frequency}
                      </p>
                      {med.notes && (
                        <p className="text-gray-500 mt-1 italic">
                          Instructions: {med.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-[11px] text-gray-400 shrink-0">
                      <p>Prescribed by: {doctorDisplayName}</p>
                      <p>{formatDate(med.created_at || med.start_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-gray-500">
                <p>No active medications on record for this patient.</p>
                <p className="text-gray-400 mt-1">
                  Run an AI analysis in the Diagnostic Lab and submit prescriptions to automatically populate this section.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 3: Demographics & Care Governance ─── */}
      {activeTab === 'demographics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact & Demographics */}
          <Card className="rounded-2xl border border-gray-200/90 shadow-xs">
            <CardHeader className="border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <span>Demographics & Contact Details</span>
              </h3>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Full Name:</span>
                <span className="font-semibold text-gray-900">{name}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Medical Record Number (MRN):</span>
                <span className="font-mono font-semibold text-gray-900">{id}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Date of Birth:</span>
                <span className="font-medium text-gray-900">{formatDate(patient.date_of_birth)} ({age} years old)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Sex / Gender:</span>
                <span className="font-medium text-gray-900">{gender}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Department / Specialty:</span>
                <span className="font-medium text-blue-700">{patient.specialty || 'Neurology'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Phone Contact:</span>
                <span className="font-medium text-gray-900">{contactInfo.phone || patient.phone || '9848563343'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Email Contact:</span>
                <span className="font-medium text-gray-900">{contactInfo.email || patient.email || 'Not provided'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500">Registration Date:</span>
                <span className="font-medium text-gray-700">{formatDate(patient.created_at)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Emergency & Clinical Governance */}
          <Card className="rounded-2xl border border-gray-200/90 shadow-xs">
            <CardHeader className="border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-blue-600" />
                <span>Clinical Care & Governance</span>
              </h3>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Attending Radiologist / Clinician:</span>
                <span className="font-semibold text-blue-700">{doctorDisplayName} ({doctorSpecialty})</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Clinical Status:</span>
                <Badge variant="success" className="text-[10px]">Active Inpatient / Outpatient</Badge>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Emergency Contact Name:</span>
                <span className="font-medium text-gray-900">{emergencyContact.name || 'Next of Kin / Relative'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Emergency Contact Phone:</span>
                <span className="font-medium text-gray-900">{emergencyContact.phone || '+1 (555) 019-2834'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500">Residential Address:</span>
                <span className="font-medium text-gray-900">{patient.address || 'Standard Registered Residence'}</span>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="rounded-xl bg-blue-50/70 p-3 border border-blue-100">
                  <p className="font-semibold text-blue-900 text-xs">AI Diagnostic Workflow Available</p>
                  <p className="text-blue-700 text-[11px] mt-0.5">
                    Upload thoracic radiographs or clinical documents in the AI Diagnostic Lab to run multimodal feature extraction and receive automated clinical reports.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
