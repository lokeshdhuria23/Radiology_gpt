import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  useAllEncounters,
  useEncounterChat,
  usePatients,
  useDoctorProfile,
} from '@/hooks/useApi'
import {
  Paperclip,
  Mic,
  ArrowUp,
  ChevronDown,
  Copy,
  Printer,
  ThumbsUp,
  ThumbsDown,
  Check,
  RefreshCw,
  FileText,
  Maximize2,
  Minimize2,
  Download,
  RotateCcw,
  RotateCw,
  Bold,
  Italic,
  AlignLeft,
  List as ListIcon,
  Upload,
  X,
  Loader2,
  Pencil,
  Sparkles,
  Database,
} from 'lucide-react'
import api from '@/lib/api'

interface DocumentItem {
  filename: string
  size: string
  type: string
  id?: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  documents?: DocumentItem[]
  actions?: string[]
}

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const encounterParam = searchParams.get('encounter')

  const { data: encountersData, refetch: refetchEncounters } = useAllEncounters()
  const { data: patientsData } = usePatients()
  const { data: profile } = useDoctorProfile()
  const encounterChat = useEncounterChat()

  const encounters = encountersData || []
  const patients = Array.isArray(patientsData) ? patientsData : (patientsData as any)?.items || []

  // Active encounter state
  const [activeEncounterId, setActiveEncounterId] = useState<string>(
    encounterParam || ''
  )

  useEffect(() => {
    if (encounterParam) {
      setActiveEncounterId(encounterParam)
    }
  }, [encounterParam])

  // Find active encounter data – start EMPTY, no hardcoded data
  const currentEncounter = encounters.find((e: any) => e.id === activeEncounterId) || null

  // Workspace Local State – all start EMPTY
  const [messages, setMessages] = useState<Message[]>([])
  const [overview, setOverview] = useState<any>(null)
  const [summaryNote, setSummaryNote] = useState('')
  const [insightsText, setInsightsText] = useState('')
  const [encounterTitle, setEncounterTitle] = useState('New Encounter')
  const [encounterTime, setEncounterTime] = useState('')

  // Document attachments – start EMPTY
  const [attachedDocs, setAttachedDocs] = useState<DocumentItem[]>([])

  // UI state
  const [prompt, setPrompt] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'summary' | 'insights'>('overview')
  const [isCopied, setIsCopied] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDossierFullscreen, setIsDossierFullscreen] = useState(false)
  const [showConnectEHR, setShowConnectEHR] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Sync state when switching encounter
  useEffect(() => {
    if (currentEncounter) {
      setMessages(currentEncounter.messages || [])
      setOverview(currentEncounter.overview || null)
      setSummaryNote(currentEncounter.summary || '')
      setInsightsText(currentEncounter.insights || '')
      setEncounterTitle(currentEncounter.title || 'New Encounter')
      setEncounterTime(currentEncounter.time_label || '')
    } else {
      // Reset to empty for new encounters
      setMessages([])
      setOverview(null)
      setSummaryNote('')
      setInsightsText('')
      setEncounterTitle('New Encounter')
      setEncounterTime('')
    }
  }, [currentEncounter?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isUploading])

  // Run pipeline analysis for given documents & prompt
  const runPipelineAnalysis = async (docs: DocumentItem[], promptText: string) => {
    const userMessage: Message = {
      role: 'user',
      content: promptText,
      documents: [...docs],
    }

    setMessages((prev) => [...prev, userMessage])

    try {
      const docIds = docs.map((d) => d.id).filter(Boolean) as string[]
      const resolvedPatientId =
        currentEncounter?.patient_id ||
        (patients.length > 0 ? patients[0].id : '347d4267-a68e-40f1-a37b-6a6bc1c1d8d6')

      const response = await encounterChat.mutateAsync({
        encounter_id: activeEncounterId || undefined,
        patient_id: resolvedPatientId,
        prompt: promptText,
        document_ids: docIds,
        specialty: profile?.specialty || 'General',
        title: encounterTitle,
      })

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.chat_response,
        actions: response.actions || ['Draft Progress Note', 'Draft H&P', 'Draft Handoff Note', 'Draft DDx'],
      }

      setMessages((prev) => [...prev, assistantMessage])
      if (response.overview) setOverview(response.overview)
      if (response.summary) setSummaryNote(response.summary)
      if (response.insights) setInsightsText(response.insights)
      if (response.title) setEncounterTitle(response.title)
      if (response.time_label) setEncounterTime(response.time_label)
      if (response.encounter_id) setActiveEncounterId(response.encounter_id)

      // Automatically switch to overview so user sees generated dossier immediately
      setActiveTab('overview')

      refetchEncounters()
    } catch {
      const fallbackMsg: Message = {
        role: 'assistant',
        content:
          'The clinical pipeline encountered an error. Please ensure the backend is running and try again.',
        actions: ['Draft Progress Note', 'Draft H&P'],
      }
      setMessages((prev) => [...prev, fallbackMsg])
    }
  }

  // Handle Document Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', 'radiology')
      const resolvedPatientId =
        currentEncounter?.patient_id ||
        (patients.length > 0 ? patients[0].id : '347d4267-a68e-40f1-a37b-6a6bc1c1d8d6')
      formData.append('patient_id', resolvedPatientId)

      const res = await api.post(`/documents/upload/${resolvedPatientId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const newDoc: DocumentItem = {
        filename: file.name,
        size: `${Math.round(file.size / 1024)} KB`,
        type: res.data?.document_category || 'imaging_report',
        id: res.data?.id,
      }

      const updatedDocs = [...attachedDocs, newDoc]
      setAttachedDocs(updatedDocs)

      // Immediately run analysis upon upload so Overview, Summary, Insights populate right away!
      await runPipelineAnalysis(
        updatedDocs,
        `Ingest and analyze diagnostic record: ${file.name}`
      )
    } catch (err) {
      // Local fallback attachment
      const fallbackDoc: DocumentItem = {
        filename: file.name,
        size: `${Math.round(file.size / 1024)} KB`,
        type: 'imaging_report',
      }
      const updatedDocs = [...attachedDocs, fallbackDoc]
      setAttachedDocs(updatedDocs)
      await runPipelineAnalysis(updatedDocs, `Ingest diagnostic file: ${file.name}`)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Submit Prompt to Pipeline
  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || prompt
    if (!textToSend.trim() && attachedDocs.length === 0) return

    setPrompt('')
    await runPipelineAnalysis(attachedDocs, textToSend)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    const content = summaryNote || insightsText
    if (!content) return
    const element = document.createElement('a')
    const file = new Blob([content], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `${(encounterTitle || 'encounter').replace(/[^a-zA-Z0-9]/g, '_')}_Encounter.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  // Check if dossier has any content
  const hasDossierContent = overview || summaryNote || insightsText

  return (
    <div className="flex h-full flex-col bg-white text-gray-900 select-none overflow-hidden">
      {/* ── Main Two-Column Split (Chat + Dossier) ─────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Center Chat & Upload Column ─────────────────────────── */}
        <section
          className={`flex flex-col bg-white transition-all duration-200 ${
            isDossierFullscreen ? 'hidden' : 'flex-1 min-w-0'
          }`}
        >
          {/* Attached Patient Documents Dropzone & Pill Row */}
          <div className="px-6 py-3 border-b border-gray-100 bg-white flex flex-wrap items-center gap-2">
            {attachedDocs.map((doc, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 shadow-2xs hover:border-gray-300 transition"
              >
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-xs font-medium text-gray-800">{doc.filename}</span>
                <span className="text-[11px] text-gray-400">({doc.size})</span>
                <button
                  onClick={() => setAttachedDocs((docs) => docs.filter((_, i) => i !== idx))}
                  className="rounded p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5 text-gray-500" />
              <span>Attach Diagnostic Report / Scan</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.dcm,.tiff,.txt,.docx"
            />
          </div>

          {/* Chat Stream Area */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800">RadiologyGPT Clinical Assistant</h3>
                <p className="text-xs text-gray-500 max-w-sm">
                  Upload diagnostic reports, scans, or documents and ask questions. The AI pipeline will generate encounter overview, summary, and clinical insights.
                </p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div key={index} className="space-y-3">
                {msg.role === 'user' ? (
                  <div className="flex flex-col items-end">
                    {msg.documents && msg.documents.length > 0 && (
                      <div className="mb-2 flex items-center gap-2 rounded-xl border border-gray-200/90 bg-white px-3 py-1.5 shadow-2xs">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="text-xs font-medium text-gray-800">
                          {msg.documents[0].filename}
                        </span>
                      </div>
                    )}
                    <div className="rounded-2xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-900 max-w-lg shadow-2xs">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs space-y-3 max-w-2xl">
                    <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b border-gray-100/60">
                      <div className="flex items-center gap-1.5 font-medium text-gray-700">
                        <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                        <span>Response generated</span>
                      </div>
                      <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                    </div>

                    <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100/60 text-gray-400">
                      <button
                        onClick={() => handleCopy(msg.content)}
                        className="rounded-lg p-1.5 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
                        title="Copy"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={handlePrint}
                        className="rounded-lg p-1.5 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
                        title="Print"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="rounded-lg p-1.5 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
                        title="Helpful"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="rounded-lg p-1.5 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
                        title="Needs improvement"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {msg.actions.map((act) => (
                          <button
                            key={act}
                            onClick={() => handleSend(act)}
                            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-100 transition cursor-pointer"
                          >
                            <Sparkles className="h-3 w-3 text-blue-500" />
                            <span>{act}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {encounterChat.isPending && (
              <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span>Running clinical pipeline & extracting findings...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Prompt Input Area – Mic, Attach, Input, Send only */}
          <div className="p-4 bg-white border-t border-gray-200/80">
            <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-xs focus-within:border-gray-300 focus-within:shadow-sm transition">
              <textarea
                rows={2}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="How else can I help? Type . for a skill or file"
                className="w-full resize-none bg-transparent px-3 py-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />

              <div className="flex items-center justify-between pt-1 px-1">
                {/* Left tools: Mic + Attachment */}
                <div className="flex items-center gap-1.5">
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition cursor-pointer"
                    title="Voice Input"
                  >
                    <Mic className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
                    title="Attach File"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                </div>

                {/* Right: Send only */}
                <button
                  onClick={() => handleSend()}
                  disabled={!prompt.trim() && attachedDocs.length === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 transition cursor-pointer"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Right Column: Encounter Dossier ────── */}
        <section
          className={`flex flex-col bg-[#fcfcfc] overflow-hidden border-l border-gray-200/80 transition-all duration-200 ${
            isDossierFullscreen ? 'flex-1' : 'w-[520px] shrink-0'
          }`}
        >
          {/* Dossier Header Tabs */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200/80 px-4 bg-white">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-gray-100 text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Encounter Overview
              </button>

              <button
                onClick={() => setActiveTab('summary')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'summary'
                    ? 'bg-gray-100 text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Encounter Summary
              </button>

              <button
                onClick={() => setActiveTab('insights')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'insights'
                    ? 'bg-gray-100 text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Encounter Insights
              </button>
            </div>

            <div className="flex items-center gap-1 text-gray-400">
              <button
                onClick={() => handleCopy(summaryNote || insightsText)}
                className="rounded-lg p-1.5 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
                title="Copy Dossier"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handlePrint}
                className="rounded-lg p-1.5 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
                title="Print"
              >
                <Printer className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleDownload}
                className="rounded-lg p-1.5 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
                title="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsDossierFullscreen(!isDossierFullscreen)}
                className="rounded-lg p-1.5 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
                title={isDossierFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
              >
                {isDossierFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Dossier Content Tabs */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* ── TAB 1: Encounter Overview ─────────────── */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {!hasDossierContent ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                      <FileText className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700">No encounter data yet</h3>
                    <p className="text-xs text-gray-400 max-w-xs">
                      Upload documents and ask questions to generate the encounter overview, summary, and clinical insights.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Timeline Box */}
                    <div>
                      <p className="text-xs font-semibold text-gray-900 mb-2">Timeline</p>
                      <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-500 shadow-2xs">
                        {overview?.timeline || 'Pending'}
                      </div>
                    </div>

                    {/* Summary Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900">
                          <span>Summary</span>
                          <Pencil className="h-3 w-3 text-gray-400" />
                        </div>
                        <button
                          onClick={() => handleSend('Refresh encounter summary')}
                          className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 transition cursor-pointer"
                        >
                          {encounterTime && <span>Updated {encounterTime}</span>}
                          <span className="mx-1">•</span>
                          <RefreshCw className="h-3 w-3" />
                          <span>Refresh</span>
                        </button>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-xs leading-relaxed text-gray-800 shadow-2xs whitespace-pre-wrap">
                        {overview?.summary || 'Upload documents to generate a clinical summary.'}
                      </div>
                    </div>

                    {/* Insights Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900">
                          <span>Insights</span>
                          <Pencil className="h-3 w-3 text-gray-400" />
                        </div>
                        <button
                          onClick={() => handleSend('Refresh clinical insights')}
                          className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 transition cursor-pointer"
                        >
                          {encounterTime && <span>Updated {encounterTime}</span>}
                          <span className="mx-1">•</span>
                          <RefreshCw className="h-3 w-3" />
                          <span>Refresh</span>
                        </button>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-xs space-y-4 shadow-2xs">
                        {overview?.insights?.next_steps && overview.insights.next_steps.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-900 mb-2">
                              Next Steps in This Encounter:
                            </p>
                            <ul className="space-y-1.5 list-disc pl-4 text-gray-700">
                              {overview.insights.next_steps.map((step: string, i: number) => (
                                <li key={i}>{step}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {overview?.insights?.disposition && overview.insights.disposition.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-900 mb-2">
                              Disposition Considerations:
                            </p>
                            <ul className="space-y-1.5 list-disc pl-4 text-gray-700">
                              {overview.insights.disposition.map((disp: string, i: number) => (
                                <li key={i}>{disp}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {!overview?.insights?.next_steps?.length && !overview?.insights?.disposition?.length && (
                          <p className="text-gray-400">No insights generated yet.</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── TAB 2: Encounter Summary ────────────── */}
            {activeTab === 'summary' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {!summaryNote ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                      <FileText className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700">No summary available</h3>
                    <p className="text-xs text-gray-400 max-w-xs">
                      Upload documents and interact with the assistant to generate a clinical SOAP documentation.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-900">Clinical SOAP Documentation</p>
                      <button
                        onClick={() => handleCopy(summaryNote)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Note</span>
                      </button>
                    </div>
                    <textarea
                      rows={20}
                      value={summaryNote}
                      onChange={(e) => setSummaryNote(e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-white p-4 font-mono text-xs text-gray-800 leading-relaxed shadow-2xs focus:border-gray-300 focus:outline-none"
                    />
                  </>
                )}
              </div>
            )}

            {/* ── TAB 3: Encounter Insights ─ */}
            {activeTab === 'insights' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                {!insightsText ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700">No insights available</h3>
                    <p className="text-xs text-gray-400 max-w-xs">
                      Clinical insights will appear here after the AI pipeline processes your uploaded documents.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Rich Text Toolbar */}
                    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-2xs text-gray-600 text-xs">
                      <button className="rounded p-1.5 hover:bg-gray-100" title="Undo">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <button className="rounded p-1.5 hover:bg-gray-100" title="Redo">
                        <RotateCw className="h-3.5 w-3.5" />
                      </button>
                      <div className="h-4 w-px bg-gray-200 mx-1" />

                      <div className="flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-gray-100 cursor-pointer">
                        <span>Normal</span>
                        <ChevronDown className="h-3 w-3 text-gray-400" />
                      </div>
                      <div className="h-4 w-px bg-gray-200 mx-1" />

                      <button className="rounded p-1.5 hover:bg-gray-100 font-bold" title="Bold">
                        <Bold className="h-3.5 w-3.5" />
                      </button>
                      <button className="rounded p-1.5 hover:bg-gray-100 italic" title="Italic">
                        <Italic className="h-3.5 w-3.5" />
                      </button>
                      <button className="rounded px-1.5 py-0.5 text-xs hover:bg-gray-100" title="Superscript">
                        x²
                      </button>
                      <button className="rounded px-1.5 py-0.5 text-xs hover:bg-gray-100" title="Subscript">
                        x₂
                      </button>
                      <div className="h-4 w-px bg-gray-200 mx-1" />

                      <button className="rounded p-1.5 hover:bg-gray-100" title="Align">
                        <AlignLeft className="h-3.5 w-3.5" />
                      </button>
                      <button className="rounded p-1.5 hover:bg-gray-100" title="List">
                        <ListIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Editable Insights Textarea */}
                    <textarea
                      rows={18}
                      value={insightsText}
                      onChange={(e) => setInsightsText(e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-white p-4 font-sans text-xs text-gray-800 leading-relaxed shadow-2xs focus:border-gray-300 focus:outline-none"
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Connect EHR / Select Patient Modal */}
      {showConnectEHR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-900">Link Patient to Encounter</h3>
              </div>
              <button
                onClick={() => setShowConnectEHR(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Select an existing patient from your roster to link this clinical session:
            </p>

            <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 rounded-xl border border-gray-200">
              {patients.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setEncounterTitle(`${p.full_name} — Diagnostic Review`)
                    setShowConnectEHR(false)
                  }}
                  className="flex w-full items-center justify-between p-3 text-left hover:bg-gray-50 transition cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{p.full_name}</p>
                    <p className="text-[11px] text-gray-500">
                      MRN: {p.patient_identifier || p.medical_record_number} • {p.specialty || 'General'}
                    </p>
                  </div>
                  <Check className="h-4 w-4 text-blue-600" />
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowConnectEHR(false)}
                className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
