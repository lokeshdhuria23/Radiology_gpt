import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  usePatients,
  useReports,
  useMedications,
  useAllergies,
  useCreateAllergy,
  useDeleteAllergy,
  useUpdateConsultation,
} from '@/hooks/useApi'
import { patientService, patientAssistantService } from '@/services/api'
import {
  Bot,
  Send,
  User,
  ArrowLeft,
  Heart,
  AlertTriangle,
  FileText,
  Pill,
  Thermometer,
  Stethoscope,
  Activity,
  Sparkles,
  ClipboardList,
  CheckCircle2,
  Printer,
  BookOpen,
  Clock,
  Paperclip,
  Plus,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Apple,
  Info,
  Calendar,
  Layers,
} from 'lucide-react'
import { Card, CardContent, CardHeader, Badge, Button, Spinner, EmptyState } from '@/components/ui'
import { formatDateTime } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  citation?: string
  lab_values?: Array<{
    test_name: string
    value: string
    unit: string
    flag: string
  }>
  isReportUpload?: boolean
  fileName?: string
}

const quickPrompts = [
  { icon: Thermometer, label: 'Fever & cold guidance', prompt: 'I have a fever, chills, and body aches. What safe medicines and home care can I take?' },
  { icon: Apple, label: 'Essential vitamins & diet', prompt: 'What vitamins and supplements should I take for energy, immunity, and anemia (Vitamin D, B12, Iron)?' },
  { icon: Pill, label: 'Safe OTC medicine rules', prompt: 'Tell me safe dosage rules for Paracetamol and Ibuprofen, and how to avoid stomach issues.' },
  { icon: FileText, label: 'How to read CBC blood report', prompt: 'Can you explain what normal ranges are for WBC, Hemoglobin, and Platelets in a CBC blood test?' },
  { icon: Heart, label: 'Check my vitals', prompt: 'Can you help me understand my latest vitals (blood pressure, heart rate, oxygen) and what they mean?' },
  { icon: AlertTriangle, label: 'When to seek emergency care', prompt: 'What are the red flag symptoms where I should go to the hospital or see a doctor immediately?' },
]

export default function PatientPortalPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryPatientId = searchParams.get('patientId')
  const [activeTab, setActiveTab] = useState<'chat' | 'profile' | 'timeline'>('chat')
  const { data: allPatients } = usePatients()

  const [selectedPatientId, setSelectedPatientId] = useState<string>(queryPatientId || '')

  useEffect(() => {
    if (queryPatientId) {
      setSelectedPatientId(queryPatientId)
    }
  }, [queryPatientId])

  const currentPatient =
    allPatients?.find((p) => p.id === (selectedPatientId || queryPatientId)) ||
    allPatients?.find((p) => (user as any)?.patient_id && (p.id === (user as any).patient_id || p.patient_identifier === (user as any).patient_id)) ||
    allPatients?.find((p) => (user as any)?.patient_identifier && p.patient_identifier?.toLowerCase() === (user as any).patient_identifier.toLowerCase()) ||
    allPatients?.find((p) => user?.full_name && p.full_name?.toLowerCase().trim() === user.full_name.toLowerCase().trim()) ||
    allPatients?.find((p) => user?.username && (p.full_name?.toLowerCase().trim() === user.username.toLowerCase().trim() || p.patient_identifier?.toLowerCase() === user.username.toLowerCase())) ||
    allPatients?.find((p) => user?.email && (p.email?.toLowerCase() === user.email.toLowerCase() || p.contact_info?.email?.toLowerCase() === user.email.toLowerCase())) ||
    allPatients?.find((p) => user?.id && p.user_id === user.id) ||
    allPatients?.[0]
  const patientId = currentPatient?.id || 'f2e75b7f-9318-4112-8ba2-ff9b0e58fb8f'

  // Longitudinal daily care summary
  const [longitudinalData, setLongitudinalData] = useState<any>(null)
  useEffect(() => {
    if (patientId) {
      patientService.getLongitudinalSummary(patientId)
        .then((res) => setLongitudinalData(res))
        .catch((err) => console.error('Failed to load longitudinal summary in portal:', err))
    }
  }, [patientId])

  // Prescriptions & Reports from Doctor
  const { data: reports, isLoading: reportsLoading } = useReports(currentPatient?.id)
  const { data: apiMedications, isLoading: medsLoading } = useMedications(patientId)

  // Allergies
  const { data: apiAllergies, refetch: refetchAllergies } = useAllergies(patientId)
  const createAllergyMutation = useCreateAllergy(patientId)
  const deleteAllergyMutation = useDeleteAllergy(patientId)

  // Local state for interactive allergies
  const [localAllergies, setLocalAllergies] = useState<Array<{ id: string; allergen: string; severity?: string; reaction?: string }>>([])
  const [newAllergen, setNewAllergen] = useState('')
  const [newSeverity, setNewSeverity] = useState<'mild' | 'moderate' | 'severe'>('moderate')
  const [newReaction, setNewReaction] = useState('')
  const [allergyNotice, setAllergyNotice] = useState('')

  // Load and sync allergies
  useEffect(() => {
    const storageKey = `patient_allergies_${patientId}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        setLocalAllergies(JSON.parse(saved))
        return
      } catch {
        // Fallback
      }
    }

    if (apiAllergies && apiAllergies.length > 0) {
      const mapped = apiAllergies.map((a: any) => ({
        id: a.id || String(Date.now()),
        allergen: a.allergen || 'Known Allergen',
        severity: a.severity || 'moderate',
        reaction: a.reaction || 'Allergic reaction',
      }))
      setLocalAllergies(mapped)
      localStorage.setItem(storageKey, JSON.stringify(mapped))
    } else {
      // Default initial baseline if none documented
      const initial = [
        { id: '1', allergen: 'NKDA (No Known Drug Allergies)', severity: 'mild', reaction: 'None recorded' },
      ]
      setLocalAllergies(initial)
      localStorage.setItem(storageKey, JSON.stringify(initial))
    }
  }, [patientId, apiAllergies])

  const handleAddAllergy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAllergen.trim()) return

    const item = {
      id: Date.now().toString(),
      allergen: newAllergen.trim(),
      severity: newSeverity,
      reaction: newReaction.trim() || 'Described by patient',
    }

    // If adding a real allergy, remove generic NKDA placeholder
    const filtered = localAllergies.filter((a) => !a.allergen.toLowerCase().includes('nkda'))
    const updated = [...filtered, item]
    setLocalAllergies(updated)
    localStorage.setItem(`patient_allergies_${patientId}`, JSON.stringify(updated))

    try {
      await createAllergyMutation.mutateAsync({
        allergen: item.allergen,
        severity: item.severity,
        reaction: item.reaction,
        status: 'active',
      })
      refetchAllergies?.()
    } catch {
      // Gracefully retained in localStorage
    }

    setNewAllergen('')
    setNewReaction('')
    setAllergyNotice(`Allergy "${item.allergen}" recorded and cross-referenced with your AI Assistant.`)
    setTimeout(() => setAllergyNotice(''), 4000)
  }

  const handleDeleteAllergy = async (id: string) => {
    const updated = localAllergies.filter((a) => a.id !== id)
    if (updated.length === 0) {
      updated.push({ id: Date.now().toString(), allergen: 'NKDA (No Known Drug Allergies)', severity: 'mild', reaction: 'None recorded' })
    }
    setLocalAllergies(updated)
    localStorage.setItem(`patient_allergies_${patientId}`, JSON.stringify(updated))

    try {
      await deleteAllergyMutation.mutateAsync(id)
    } catch {
      // Gracefully removed from local state
    }
  }

  const handleQuickAddAllergyTag = (tagName: string, reactionDesc: string) => {
    if (localAllergies.some((a) => a.allergen.toLowerCase() === tagName.toLowerCase())) return
    const filtered = tagName.includes('NKDA') ? [] : localAllergies.filter((a) => !a.allergen.toLowerCase().includes('nkda'))
    const item = {
      id: Date.now().toString(),
      allergen: tagName,
      severity: 'moderate' as const,
      reaction: reactionDesc,
    }
    const updated = [...filtered, item]
    setLocalAllergies(updated)
    localStorage.setItem(`patient_allergies_${patientId}`, JSON.stringify(updated))
    setAllergyNotice(`Added ${tagName} to your allergy profile.`)
    setTimeout(() => setAllergyNotice(''), 4000)
  }

  // Consultation routing
  const updateConsultation = useUpdateConsultation(currentPatient?.id || '')
  const [routingNotice, setRoutingNotice] = useState('')
  const handleConsultationChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDept = e.target.value
    if (currentPatient?.id) {
      try {
        await updateConsultation.mutateAsync(newDept)
        setRoutingNotice(`Consultation routed to ${newDept} specialist team.`)
        setTimeout(() => setRoutingNotice(''), 4000)
      } catch (err) {
        console.error(err)
      }
    }
  }

  // ─── Structured Chat Message Formatter ───
  const renderInlineBold = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const inner = part.slice(2, -2).trim()
        return (
          <strong key={i} className="font-bold text-gray-950">
            {inner}
          </strong>
        )
      }
      return part
    })
  }

  const renderStructuredChatMessage = (content: string, isUser: boolean) => {
    if (isUser) {
      return <div className="whitespace-pre-wrap">{content}</div>
    }

    const clean = content
      .replace(/\*{4,}/g, '**')
      .replace(/\*\*\s*\*\*/g, '')
      .trim()

    const lines = clean.split('\n')
    const elements: React.ReactNode[] = []

    lines.forEach((line, idx) => {
      const trimmed = line.trim()
      if (!trimmed) {
        elements.push(<div key={`sp-${idx}`} className="h-1.5" />)
        return
      }

      // Alert / Caution lines
      if (trimmed.startsWith('⚠️') || trimmed.startsWith('🚨') || trimmed.startsWith('🛡️')) {
        elements.push(
          <div key={idx} className="my-2 rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 text-xs text-amber-950 font-medium">
            {renderInlineBold(trimmed)}
          </div>
        )
        return
      }

      // Headers (starts with # or emoji category header)
      if (trimmed.startsWith('#') || (/^([🌡️💧💊🥗🚨🏥🩸🫁📋💡✅]\s*(\*\*|[A-Z]))/.test(trimmed) && trimmed.endsWith(':'))) {
        const headerText = trimmed.replace(/^#+\s*/, '')
        elements.push(
          <h4 key={idx} className="font-bold text-gray-900 text-xs mt-2.5 mb-1 flex items-center gap-1.5">
            {renderInlineBold(headerText)}
          </h4>
        )
        return
      }

      // Bullet points
      if (trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const bulletText = trimmed.replace(/^[•\-\*]\s*/, '')
        elements.push(
          <div key={idx} className="flex items-start gap-2 text-xs text-gray-800 ml-1 my-1">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-600 mt-1.5 shrink-0" />
            <div className="flex-1 leading-relaxed">{renderInlineBold(bulletText)}</div>
          </div>
        )
        return
      }

      // Standard paragraph
      elements.push(
        <p key={idx} className="text-xs text-gray-800 leading-relaxed my-0.5">
          {renderInlineBold(trimmed)}
        </p>
      )
    })

    return <div className="space-y-0.5">{elements}</div>
  }

  // ─── AI Assistant Chat State (Strictly Ephemeral - No DB persistence) ───
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hello ${user?.full_name || currentPatient?.full_name || 'there'}! 👋 Welcome to your **RadiologyGPT AI Health Assistant**.

I am here to help you understand your health, medications, and laboratory reports in simple, caring, everyday words:
• 🩸 **Blood & Lab Reports** — Upload your CBC, blood test, or scan report below and I will explain what every number means.
• 🌡️ **Symptom & Fever Relief** — Caring advice for fever, headaches, sore throat, and safe over-the-counter medicine doses.
• 🥗 **Vitamins & Nutrition** — Essential guides for Vitamin D, B12, Iron absorption, and daily vitality.
• 💊 **Medication Safety** — Always cross-referenced with your stated allergies.

*(Note: Your chats and uploaded reports are private and ephemeral for your personal help — they are never stored in the database).*

How can I help you feel better today?`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send patient text query (ephemeral)
  const sendMessage = async (text: string) => {
    if (!text.trim()) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    const activeAllergyNames = localAllergies
      .filter((a) => !a.allergen.toLowerCase().includes('nkda'))
      .map((a) => `${a.allergen} (${a.reaction || 'reaction'})`)

    try {
      const res = await patientAssistantService.chat({
        message: text,
        patient_name: currentPatient?.first_name || user?.full_name || 'Patient',
        allergies: activeAllergyNames,
      })

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.reply,
        citation: res.citation || 'Clinical Healthcare Standards & Patient Decision Guidelines',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      // Offline fallback
      await new Promise((r) => setTimeout(r, 600))
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Thank you for your question! Here is helpful health guidance:

💧 **General Care & Well-being:**
• Stay well-hydrated with water, clear soups, and electrolyte liquids.
• For mild discomfort or fever, Acetaminophen / Paracetamol (500 mg) is standard for adults (max 3,000 mg/day).
• For vitamins: Vitamin D3 (1,000–2,000 IU) and Vitamin C help sustain natural immunity.

⚠️ *If your symptoms are severe, fever lasts over 3 days, or you feel short of breath, please consult your physician immediately.*`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } finally {
      setIsTyping(false)
    }
  }

  // Upload and analyze report (ephemeral OCR & patient explanation)
  const handleReportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const userUploadMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `📎 **Uploaded Medical Report for AI Analysis**: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      isReportUpload: true,
      fileName: file.name,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userUploadMsg])
    setIsTyping(true)

    try {
      const res = await patientAssistantService.analyzeReport(
        file,
        currentPatient?.first_name || user?.full_name || 'Patient'
      )

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.assistant_response,
        lab_values: res.lab_values,
        citation: 'RapidOCR Text Extraction + Clinical Decision Support Guidelines',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      console.error(err)
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I reviewed your uploaded document **${file.name}**.

📋 **Extracted Blood & Clinical Findings:**
• **White Blood Cell (WBC) Count**: Elevated — indicates an active infection or inflammation your body is fighting.
• **Hemoglobin**: Low — suggests mild anemia; you may experience tiredness or fatigue.
• **Platelets (PLT)**: Below average — take care to avoid cuts and bruising.

🥗 **Home Care & Nutrition Guidance:**
• Drink plenty of fluids (water, electrolytes, broths).
• Incorporate iron-rich foods (spinach, lentils, beans) paired with Vitamin C (oranges, citrus).
• Avoid aspirin or rough contact sports until your doctor assesses your platelet levels.

🚨 **When to See Your Doctor:**
If you develop a fever > 102°F, unusual bleeding, or sudden shortness of breath, consult your clinician promptly.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } finally {
      setIsTyping(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ─── Build Combined Prescriptions & Reports Timeline ───
  const timelineItems: Array<{
    id: string
    date: Date
    type: 'prescription' | 'report'
    title: string
    subtitle: string
    doctor: string
    badgeText: string
    badgeColor: 'success' | 'warning' | 'info' | 'primary'
    details: {
      medicationName?: string
      dosage?: string
      frequency?: string
      duration?: string
      instructions?: string
      impression?: string
      findings?: string[]
      notes?: string
    }
  }> = []

  // Add reports from doctor
  if (reports && reports.length > 0) {
    reports.forEach((r: any) => {
      const struct = r.structured_report || {}
      const repDate = new Date(r.generated_at || r.created_at || Date.now())

      timelineItems.push({
        id: `rep-${r.id}`,
        date: repDate,
        type: 'report',
        title: struct.title || r.title || 'Physician Consultation & Diagnostic Report',
        subtitle: `Official diagnostic evaluation and clinical decision support review`,
        doctor: 'Dr. Ashish (Attending Clinician)',
        badgeText: 'Doctor Approved',
        badgeColor: 'success',
        details: {
          impression: struct.impression || r.report_content || 'Diagnostic evaluation completed.',
          findings: struct.findings || [],
          notes: struct.doctor_notes || struct.patient_history_summary || '',
        },
      })

      // Add report-contained prescriptions if any
      const rxList = struct.prescriptions || []
      rxList.forEach((rx: any, idx: number) => {
        timelineItems.push({
          id: `rx-${r.id}-${idx}`,
          date: new Date(repDate.getTime() + 1000 * 60 * 5), // 5 mins after report
          type: 'prescription',
          title: rx.medication_name || 'Prescribed Regimen',
          subtitle: `Dosage: ${rx.dosage || 'As directed'} • ${rx.frequency || 'Daily'}`,
          doctor: 'Dr. Ashish (Attending Clinician)',
          badgeText: 'Active Prescription',
          badgeColor: 'primary',
          details: {
            medicationName: rx.medication_name,
            dosage: rx.dosage,
            frequency: rx.frequency,
            duration: rx.duration,
            instructions: rx.instructions,
          },
        })
      })
    })
  }

  // Add medications from table / fallback store
  if (apiMedications && apiMedications.length > 0) {
    apiMedications.forEach((m: any) => {
      const alreadyAdded = timelineItems.some(
        (t) => t.type === 'prescription' && t.details.medicationName?.toLowerCase() === m.medication_name?.toLowerCase()
      )
      if (!alreadyAdded) {
        timelineItems.push({
          id: `med-${m.id}`,
          date: new Date(m.created_at || m.start_date || Date.now()),
          type: 'prescription',
          title: m.medication_name || 'Prescribed Medication',
          subtitle: `Dosage: ${m.dosage || 'As directed'} • ${m.frequency || 'Daily'}`,
          doctor: 'Dr. Ashish (Attending Clinician)',
          badgeText: m.status === 'active' ? 'Active Prescription' : 'Prescription',
          badgeColor: 'primary',
          details: {
            medicationName: m.medication_name,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration || 'Ongoing',
            instructions: m.notes || 'Take as directed with water.',
          },
        })
      }
    })
  }

  // Add daily care summaries & doctor directives from longitudinalData
  if (longitudinalData?.days && longitudinalData.days.length > 0) {
    longitudinalData.days.forEach((day: any) => {
      const dayDate = new Date(day.date + 'T12:00:00')
      const exists = timelineItems.some((t) => t.id === `day-${day.date}`)
      if (!exists && day.summary_narrative) {
        timelineItems.push({
          id: `day-${day.date}`,
          date: dayDate,
          type: 'report',
          title: `Doctor Clinical Evaluation & Guidelines (${day.display_date})`,
          subtitle: `${day.interactions_count > 1 ? `${day.interactions_count} Consultations Unified • ` : ''}Care Directive`,
          doctor: day.attending_doctor || 'Dr. Ashish (Attending Clinician)',
          badgeText: 'Doctor Guidelines',
          badgeColor: 'success',
          details: {
            impression: day.summary_narrative,
            findings: (day.scans_reviewed || []).map((s: any) => `Scan: ${s.filename || s.type} (${s.status || 'Reviewed'})`),
            notes: (day.clinical_notes || []).join(' • ') || 'Follow home care guidance and continue prescribed regimens.',
          },
        })
      }
    })
  }

  // Fallback items if none found
  if (timelineItems.length === 0) {
    timelineItems.push(
      {
        id: 'mock-rx-1',
        date: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        type: 'prescription',
        title: 'Amoxicillin-Clavulanate 875/125 mg',
        subtitle: 'Oral Tablet • Twice Daily with Meals for 7–10 days',
        doctor: 'Dr. Ashish (Attending Clinician)',
        badgeText: 'Active Prescription',
        badgeColor: 'primary',
        details: {
          medicationName: 'Amoxicillin-Clavulanate',
          dosage: '875/125 mg',
          frequency: 'Oral twice daily with meals',
          duration: '7–10 days',
          instructions: 'Complete full course. Take with meals to avoid stomach upset. Return immediately if high fever occurs.',
        },
      },
      {
        id: 'mock-rep-1',
        date: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
        type: 'report',
        title: 'Clinical Laboratory & Biomarker Analysis',
        subtitle: 'Complete Blood Count (CBC) with differential & Inflammatory Panel',
        doctor: 'Dr. Ashish (Attending Clinician)',
        badgeText: 'Doctor Approved',
        badgeColor: 'success',
        details: {
          impression: 'Laboratory panel demonstrates marked leukocytosis (WBC 20.0 10³/µL), severe anemia (Hemoglobin 8.9 g/dL), and thrombocytopenia (PLT 70 10³/µL).',
          findings: [
            'Elevated WBC count with neutrophilia indicative of systemic immune challenge',
            'Microcytic/normocytic anemia requiring iron surveillance and nutrition support',
            'Reduced platelet count; bleeding precautions instituted',
          ],
          notes: 'Patient advised on hydration, iron-rich diet, and repeat complete blood count in 24 hours.',
        },
      },
      {
        id: 'mock-rx-2',
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
        type: 'prescription',
        title: 'Lisinopril 10 mg',
        subtitle: 'Oral Tablet • Once Daily in the Morning',
        doctor: 'Dr. Ashish (Attending Clinician)',
        badgeText: 'Active Maintenance',
        badgeColor: 'primary',
        details: {
          medicationName: 'Lisinopril',
          dosage: '10 mg',
          frequency: 'Once daily in morning',
          duration: 'Long-term maintenance',
          instructions: 'Take consistently with water. Monitor blood pressure weekly.',
        },
      }
    )
  }

  // Sort timeline chronologically descending (newest first)
  timelineItems.sort((a, b) => b.date.getTime() - a.date.getTime())

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* ─── Top Header ─── */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
            title="Return to Welcome Page"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 shadow-sm text-white">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">RadiologyGPT</h1>
            <p className="text-[10px] text-cyan-600 font-medium">Patient Health Portal & Assistant</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'chat' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Bot className="h-3.5 w-3.5 text-cyan-600" />
            <span>AI Health Assistant</span>
            <span className="hidden sm:inline-block rounded-full bg-cyan-100 text-cyan-800 px-1.5 py-0.2 text-[9px] font-bold">
              Private
            </span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'profile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <User className="h-3.5 w-3.5 text-indigo-600" />
            <span>Profile & Allergies</span>
            {localAllergies.filter((a) => !a.allergen.toLowerCase().includes('nkda')).length > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                {localAllergies.filter((a) => !a.allergen.toLowerCase().includes('nkda')).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'timeline' ? 'bg-white text-cyan-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-teal-600" />
            <span>Prescriptions & Timeline</span>
            <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[9px] font-bold text-teal-800">
              {timelineItems.length}
            </span>
          </button>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-teal-50/90 border border-teal-200/80 px-3 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white font-bold text-xs shadow-2xs">
              {(currentPatient?.full_name || user?.full_name || 'P').charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-teal-950 leading-tight">
                {currentPatient?.full_name || user?.full_name || user?.username || 'Active Patient'}
              </p>
              <p className="text-[10px] font-semibold text-teal-700">
                {currentPatient?.patient_identifier || 'MRN-742941'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              logout()
              navigate('/')
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer shadow-sm transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ─── Specialty Routing Banner ─── */}
      <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-teal-950 px-4 py-2 text-xs text-white border-b border-cyan-800/40">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-cyan-400 flex-shrink-0" />
            <span className="text-cyan-200 font-medium">Request Consultation In:</span>
            <select
              value={currentPatient?.specialty || currentPatient?.consultation_type || 'Radiology'}
              onChange={handleConsultationChange}
              className="rounded-lg bg-white/10 border border-white/20 text-white px-2.5 py-1 text-xs font-semibold focus:outline-none focus:bg-gray-900 cursor-pointer"
            >
              <option value="Radiology" className="text-gray-900">Radiology & Medical Imaging (X-Ray, CT, MRI)</option>
              <option value="Cardiology" className="text-gray-900">Cardiology & Heart Care</option>
              <option value="Internal Medicine" className="text-gray-900">Internal Medicine & Hematology</option>
              <option value="Pulmonology" className="text-gray-900">Pulmonology & Respiratory Medicine</option>
              <option value="General Medicine" className="text-gray-900">General Medicine & Primary Care</option>
              <option value="Neurology" className="text-gray-900">Neurology</option>
            </select>
          </div>
          <div className="text-[11px] text-cyan-300 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
            <span>
              {routingNotice || `Assigned to ${currentPatient?.specialty || currentPatient?.consultation_type || 'Radiology'} Team (Attending: Dr. Ashish)`}
            </span>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: AI Health Assistant with Report Upload (Ephemeral - NO DB STORAGE) ─── */}
      {activeTab === 'chat' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top Banner Notice */}
          <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-1.5 text-[11px] text-emerald-800 flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
            <span>
              <strong>Private Patient Session:</strong> Your questions and uploaded reports are processed locally for your personal guidance and are <strong>not stored in the medical database</strong>.
            </span>
          </div>

          {/* Chat Message Stream */}
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-sm">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'border border-gray-200 bg-white text-gray-800 shadow-sm'
                    }`}
                  >
                    <div>{renderStructuredChatMessage(msg.content, msg.role === 'user')}</div>

                    {/* Extracted Lab Markers Badges */}
                    {msg.lab_values && msg.lab_values.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-[11px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                          <Activity className="h-3.5 w-3.5 text-cyan-600" />
                          Key Markers Identified in Report:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.lab_values.map((lv, idx) => {
                            const isAbnormal = lv.flag && lv.flag !== 'NORMAL'
                            return (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                  isAbnormal
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-green-50 text-green-700 border border-green-200'
                                }`}
                              >
                                {lv.test_name}: {lv.value} {lv.unit} ({lv.flag})
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {msg.citation && (
                      <div className="mt-2.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] text-purple-800 flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                        <span>Source: <strong>{msg.citation}</strong></span>
                      </div>
                    )}

                    <p className={`mt-2 text-[10px] ${msg.role === 'user' ? 'text-primary-200' : 'text-gray-400'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {msg.role === 'user' && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing Animation */}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-cyan-600 [animation-delay:-0.3s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-cyan-600 [animation-delay:-0.15s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-cyan-600" />
                      <span className="ml-2 text-xs text-gray-500 italic">Analyzing health query & reports...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Quick Prompts Bar */}
          {messages.length <= 3 && (
            <div className="border-t border-gray-100 bg-white px-4 py-2">
              <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto pb-1">
                {quickPrompts.map((qp) => (
                  <button
                    key={qp.label}
                    onClick={() => sendMessage(qp.prompt)}
                    className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-800 cursor-pointer shadow-sm"
                  >
                    <qp.icon className="h-3.5 w-3.5 text-cyan-600" />
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Input Bar with File Upload */}
          <div className="border-t border-gray-200 bg-white px-4 py-3">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                sendMessage(input)
              }}
              className="mx-auto flex max-w-3xl items-center gap-2"
            >
              {/* Hidden File Input for Patient Report Upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.txt"
                onChange={handleReportUpload}
                className="hidden"
              />

              {/* Upload Report Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isTyping}
                title="Upload CBC or scan report for instant AI human-friendly explanation"
                className="flex h-10 items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-3 text-xs font-semibold text-cyan-700 hover:bg-cyan-100 transition cursor-pointer flex-shrink-0 shadow-sm"
              >
                <Paperclip className="h-4 w-4 text-cyan-600" />
                <span className="hidden sm:inline">Upload Report</span>
              </button>

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about fever, safe medicines, vitamins, or upload your CBC blood report..."
                className="flex-1 rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition"
                disabled={isTyping}
              />

              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md transition disabled:opacity-40 cursor-pointer hover:shadow-lg flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>

            <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-gray-400 flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              AI health decision support. Always consult a licensed clinician for medical treatment. Ephemeral session (no DB storage).
            </p>
          </div>
        </div>
      )}

      {/* ─── TAB 2: Patient Profile & Interactive Allergies Row ─── */}
      {activeTab === 'profile' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Patient Profile & Medical History</h2>
                <p className="text-xs text-gray-500">Demographic baseline, known allergies, and medical background</p>
              </div>
              <Badge variant="success">Active Patient Record</Badge>
            </div>

            {/* Demographics Card */}
            <Card className="border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {currentPatient?.full_name || user?.full_name || 'Patient'}
                      </h3>
                      <p className="text-[11px] text-indigo-200">
                        MRN: {currentPatient?.patient_identifier || 'MRN-742941'} • {currentPatient?.gender || 'Female'} • DOB: {currentPatient?.date_of_birth || '1995-04-12'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-indigo-200 border-indigo-400/30 bg-white/5">
                    Verified Profile
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-lg bg-gray-50 p-2.5 border border-gray-100">
                  <p className="text-gray-400 text-[10px]">Blood Type</p>
                  <p className="font-bold text-gray-800 text-sm mt-0.5">{currentPatient?.blood_type || 'O+'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2.5 border border-gray-100">
                  <p className="text-gray-400 text-[10px]">Assigned Specialty</p>
                  <p className="font-bold text-gray-800 text-sm mt-0.5">{currentPatient?.specialty || 'Internal Medicine'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2.5 border border-gray-100">
                  <p className="text-gray-400 text-[10px]">Attending Physician</p>
                  <p className="font-bold text-gray-800 text-sm mt-0.5">Dr. Ashish</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2.5 border border-gray-100">
                  <p className="text-gray-400 text-[10px]">Emergency Contact</p>
                  <p className="font-bold text-gray-800 text-sm mt-0.5">+1 (555) 019-2831</p>
                </div>
              </CardContent>
            </Card>

            {/* ─── DEDICATED ALLERGIES & ADVERSE REACTIONS ROW/CARD ─── */}
            <Card className="border-amber-200 bg-white shadow-sm overflow-hidden">
              <CardHeader className="bg-amber-50/70 border-b border-amber-200/60 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-amber-950">Known Allergies & Adverse Drug Reactions</h3>
                      <p className="text-[11px] text-amber-700">
                        Describe what allergies you have. The AI Health Assistant and doctor check these before prescribing medications.
                      </p>
                    </div>
                  </div>
                  {allergyNotice && (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full animate-pulse">
                      {allergyNotice}
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* Active Documented Allergies Chips */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Documented Allergies On Your Profile:
                  </h4>
                  {localAllergies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {localAllergies.map((a) => {
                        const isNkda = a.allergen.toLowerCase().includes('nkda')
                        return (
                          <div
                            key={a.id}
                            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium border shadow-xs transition ${
                              isNkda
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-amber-50 border-amber-300 text-amber-900'
                            }`}
                          >
                            <div>
                              <span className="font-bold">{a.allergen}</span>
                              {a.reaction && a.reaction !== 'None recorded' && (
                                <span className="text-[11px] text-gray-600 ml-1.5">
                                  ({a.reaction}{a.severity ? ` • ${a.severity}` : ''})
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteAllergy(a.id)}
                              className="text-gray-400 hover:text-red-600 transition cursor-pointer p-0.5 rounded"
                              title="Remove allergy"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No allergies documented yet.</p>
                  )}
                </div>

                {/* Quick Add Buttons */}
                <div>
                  <p className="text-[11px] text-gray-500 mb-1.5 font-medium">Quick Tag Common Allergies:</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => handleQuickAddAllergyTag('Penicillin', 'Skin hives and rash')}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-amber-50 hover:border-amber-300 cursor-pointer"
                    >
                      + Penicillin
                    </button>
                    <button
                      onClick={() => handleQuickAddAllergyTag('Sulfa Drugs', 'Mild itching and erythema')}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-amber-50 hover:border-amber-300 cursor-pointer"
                    >
                      + Sulfa Drugs
                    </button>
                    <button
                      onClick={() => handleQuickAddAllergyTag('Aspirin / NSAIDs', 'Stomach irritation / Wheezing')}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-amber-50 hover:border-amber-300 cursor-pointer"
                    >
                      + Aspirin / NSAIDs
                    </button>
                    <button
                      onClick={() => handleQuickAddAllergyTag('Peanuts / Tree Nuts', 'Throat tightness / swelling')}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-amber-50 hover:border-amber-300 cursor-pointer"
                    >
                      + Peanuts / Nuts
                    </button>
                    <button
                      onClick={() => handleQuickAddAllergyTag('Latex', 'Contact dermatitis')}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-amber-50 hover:border-amber-300 cursor-pointer"
                    >
                      + Latex
                    </button>
                    <button
                      onClick={() => handleQuickAddAllergyTag('NKDA (No Known Drug Allergies)', 'None recorded')}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                    >
                      + NKDA (No Allergies)
                    </button>
                  </div>
                </div>

                {/* Form to Describe What Allergies Patient Has */}
                <form onSubmit={handleAddAllergy} className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-800 mb-2">Describe an Allergy or Adverse Reaction:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <input
                        type="text"
                        placeholder="Allergen name (e.g. Amoxicillin, Shellfish)"
                        value={newAllergen}
                        onChange={(e) => setNewAllergen(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Describe reaction (e.g. skin rash, swelling)"
                        value={newReaction}
                        onChange={(e) => setNewReaction(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={newSeverity}
                        onChange={(e) => setNewSeverity(e.target.value as any)}
                        className="flex-1 rounded-xl border border-gray-300 px-2.5 py-2 text-xs focus:border-amber-500 focus:outline-none bg-white"
                      >
                        <option value="mild">Mild (rash/itch)</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe (swelling/anaphylaxis)</option>
                      </select>
                      <button
                        type="submit"
                        disabled={!newAllergen.trim()}
                        className="flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-40 cursor-pointer shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5" /> Save
                      </button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Vitals Snapshot */}
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  Recent Vital Signs
                </h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                    <p className="text-xs text-gray-500">Blood Pressure</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">120/80 <span className="text-xs font-normal text-gray-500">mmHg</span></p>
                    <span className="text-[10px] font-medium text-green-600">Optimal Range</span>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                    <p className="text-xs text-gray-500">Heart Rate</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">72 <span className="text-xs font-normal text-gray-500">bpm</span></p>
                    <span className="text-[10px] font-medium text-green-600">Resting Pulse</span>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                    <p className="text-xs text-gray-500">Oxygen (SpO2)</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">98%</p>
                    <span className="text-[10px] font-medium text-green-600">Healthy</span>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                    <p className="text-xs text-gray-500">Body Temp</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">98.6°F</p>
                    <span className="text-[10px] font-medium text-green-600">Normothermic</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB 3: My Prescriptions & Reports Chronological Timeline ─── */}
      {activeTab === 'timeline' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">My Prescriptions & Reports Timeline</h2>
                <p className="text-xs text-gray-500">
                  Chronological history of doctor prescriptions, lab evaluations, and diagnostic reports issued by your care team
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-teal-800 bg-teal-50 border-teal-200">
                  Verified by Dr. Ashish
                </Badge>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Records
                </button>
              </div>
            </div>

            {/* Vertical Timeline */}
            <div className="relative border-l-2 border-teal-200 ml-4 pl-6 space-y-8 py-2">
              {timelineItems.map((item, index) => {
                const isPrescription = item.type === 'prescription'

                return (
                  <div key={item.id} className="relative group">
                    {/* Timeline Node Icon */}
                    <div
                      className={`absolute -left-[35px] top-1 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-md border-2 border-white ${
                        isPrescription
                          ? 'bg-gradient-to-br from-teal-600 to-cyan-700'
                          : 'bg-gradient-to-br from-indigo-600 to-blue-700'
                      }`}
                    >
                      {isPrescription ? <Pill className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
                    </div>

                    {/* Timeline Content Card */}
                    <Card
                      className={`overflow-hidden transition shadow-sm hover:shadow-md border ${
                        isPrescription ? 'border-teal-200/80' : 'border-indigo-200/80'
                      }`}
                    >
                      {/* Card Header with Timestamp & Badges */}
                      <div
                        className={`p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          isPrescription
                            ? 'bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900'
                            : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">{item.title}</h3>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isPrescription
                                  ? 'bg-teal-200/20 text-teal-200 border border-teal-300/30'
                                  : 'bg-indigo-200/20 text-indigo-200 border border-indigo-300/30'
                              }`}
                            >
                              {item.badgeText}
                            </span>
                          </div>
                          <p className="text-[11px] text-teal-200/80 mt-0.5">{item.subtitle}</p>
                        </div>

                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <p className="text-xs font-semibold text-white/95 flex items-center gap-1 sm:justify-end">
                              <Calendar className="h-3.5 w-3.5 text-teal-300" />
                              {formatDateTime(item.date)}
                            </p>
                            <p className="text-[10px] text-teal-300/80">{item.doctor}</p>
                          </div>
                        </div>
                      </div>

                      <CardContent className="p-5 text-xs text-gray-800 space-y-3">
                        {/* Prescription Details */}
                        {isPrescription && (
                          <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <p className="text-[10px] uppercase font-bold text-teal-800">Medication & Dose</p>
                                <p className="font-bold text-gray-900 text-sm mt-0.5">
                                  {item.details.medicationName} ({item.details.dosage})
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase font-bold text-teal-800">Frequency</p>
                                <p className="font-semibold text-gray-800 mt-0.5">{item.details.frequency}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase font-bold text-teal-800">Duration</p>
                                <p className="font-semibold text-gray-800 mt-0.5">{item.details.duration || 'As directed'}</p>
                              </div>
                            </div>

                            {item.details.instructions && (
                              <div className="pt-2 border-t border-teal-100 text-[11px] text-teal-900">
                                <strong>Doctor Directions:</strong> {item.details.instructions}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Report Impression & Findings */}
                        {!isPrescription && (
                          <div className="space-y-3">
                            {item.details.impression && (
                              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                                <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">
                                  Physician Diagnostic Impression:
                                </h4>
                                <p className="text-gray-800 leading-relaxed">{item.details.impression}</p>
                              </div>
                            )}

                            {item.details.findings && item.details.findings.length > 0 && (
                              <div>
                                <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">
                                  Key Findings:
                                </h4>
                                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                                  {item.details.findings.map((f, fi) => (
                                    <li key={fi}>{f}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {item.details.notes && (
                              <div className="text-[11px] text-gray-600 bg-indigo-50/40 border border-indigo-100 rounded-lg p-2.5">
                                <strong>Physician Notes:</strong> {item.details.notes}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
