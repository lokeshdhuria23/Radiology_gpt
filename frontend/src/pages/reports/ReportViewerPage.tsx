import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useReport, useSubmitReview } from '@/hooks/useApi'
import { reportService } from '@/services/api'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Card, CardContent, CardHeader, Badge, Button, Textarea, Spinner,
  EmptyState,
} from '@/components/ui'
import {
  ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Printer, FileText,
  Shield, Brain, Clock, AlertCircle, Pill, Send, Check
} from 'lucide-react'
import { formatDateTime, capitalize, severityColor } from '@/lib/utils'
import type { ReportReviewCreate } from '@/types'

export default function ReportViewerPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const navigate = useNavigate()
  const { data: report, isLoading } = useReport(reportId!)
  const submitReview = useSubmitReview(reportId!)
  const [showReview, setShowReview] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const { register, handleSubmit, reset, setValue } = useForm<ReportReviewCreate>()

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!report) return <EmptyState title="Report not found" />

  const struct = (report as any).structured_report || {}
  const prescriptions = (report as any).prescriptions || struct.prescriptions || []
  const historySummary = (report as any).patient_history_summary || struct.patient_history_summary || ''
  const findingsList = (report as any).findings || struct.findings || []
  const sections = (report.sections as Record<string, any>) || {}
  const reportSent = isSent || (report as any).sent_to_patient || struct.sent_to_patient || report.status === 'finalized'

  const onSubmitReview = async (data: ReportReviewCreate) => {
    await submitReview.mutateAsync(data)
    setShowReview(false)
    reset()
  }

  const handleSendToPatient = async () => {
    setIsSending(true)
    try {
      await reportService.sendToPatient(report.id, prescriptions)
      setIsSent(true)
    } catch (e) {
      console.error('Failed to sync to patient:', e)
    } finally {
      setIsSending(false)
    }
  }

  const handlePrint = () => window.print()

  return (
    <div className="print:p-0">
      <div className="print:hidden">
        <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 cursor-pointer">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <PageHeader
        title={report.title || struct.title || 'Clinical Diagnostic Report'}
        description={`Generated ${formatDateTime(report.generated_at || report.created_at)}`}
        actions={
          <div className="flex items-center gap-2 print:hidden flex-wrap">
            {report.is_demo_mode && <Badge variant="warning">Demo Mode</Badge>}
            <Button
              variant={reportSent ? 'outline' : 'default'}
              onClick={handleSendToPatient}
              disabled={isSending || reportSent}
              className={reportSent ? 'text-emerald-700 border-emerald-300 bg-emerald-50' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
            >
              {isSending ? (
                <Spinner size="sm" />
              ) : reportSent ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {reportSent ? 'Prescription Synced to Patient' : 'Send Prescription to Patient'}
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button onClick={() => setShowReview(!showReview)}>
              <CheckCircle2 className="h-4 w-4" /> Review
            </Button>
          </div>
        }
      />

      {/* AI Disclaimer */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 print:border-black print:bg-white">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">AI-Generated Clinical Decision Support Report</p>
          <p className="mt-0.5 text-xs text-amber-700">
            This report was synthesized with multimodal AI agents (BioMistral LoRA & trained VisionProjectors) and clinical decision support rules. It must be reviewed and signed by the attending clinician before therapeutic action.
          </p>
        </div>
      </div>

      {/* Report Status */}
      <Card className="mb-6">
        <CardContent className="flex items-center justify-between py-4 flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Status:</span>
              <Badge variant={report.status === 'approved' || reportSent ? 'success' : report.status === 'rejected' ? 'danger' : 'secondary'}>
                {reportSent ? 'Finalized & Released to Patient' : capitalize(report.status)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Findings: {findingsList.length || report.findings_count || 1}</span>
            </div>
            <div className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-teal-600" />
              <span className="text-sm text-gray-600">Prescriptions: {prescriptions.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient Previous Medical History Summary Card */}
      {historySummary && (
        <Card className="mb-6 border-indigo-100 bg-indigo-50/40">
          <CardHeader>
            <h3 className="text-sm font-semibold text-indigo-950 flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600" />
              Patient Previous Medical History Summary
            </h3>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-indigo-950 leading-relaxed whitespace-pre-wrap font-medium">
              {historySummary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Clinical Impression / Summary */}
      <Card className="mb-6">
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-900">Clinical Impression</h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {report.summary || (report as any).impression || struct.impression || (report as any).report_content}
          </p>
        </CardContent>
      </Card>

      {/* Prescriptions & Regimen Card */}
      {prescriptions.length > 0 && (
        <Card className="mb-6 border-teal-200 bg-teal-50/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="text-sm font-semibold text-teal-950 flex items-center gap-2">
              <Pill className="h-4 w-4 text-teal-700" />
              Prescriptions & Therapeutic Regimen (Ready to Release)
            </h3>
            <Badge variant={reportSent ? 'success' : 'outline'}>
              {reportSent ? 'Released to Patient Dashboard' : 'Pending Physician Release'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-teal-100 rounded-xl border border-teal-200 bg-white overflow-hidden text-xs">
              {prescriptions.map((rx: any, idx: number) => (
                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{rx.medication_name}</p>
                    <p className="text-gray-600 mt-0.5">
                      Dosage: <strong className="text-gray-900">{rx.dosage}</strong> • Frequency: {rx.frequency} {rx.duration ? `• Duration: ${rx.duration}` : ''}
                    </p>
                    {rx.instructions && (
                      <p className="text-teal-700 mt-1 italic text-xs">
                        Instructions: {rx.instructions}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800 self-start sm:self-center">
                    Active Prescription
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Diagnostic Findings */}
      {findingsList.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-900">Key Diagnostic Findings</h3>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-xs text-gray-700 space-y-1.5">
              {findingsList.map((f: string, i: number) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Report Sections */}
      {Object.keys(sections).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Multi-Agent Specialist Findings</h3>
          {Object.entries(sections).map(([key, section]: [string, any]) => {
            if (key === 'patient_history' || key === 'prescriptions') return null
            return (
              <Card key={key}>
                <CardHeader>
                  <h3 className="text-sm font-semibold text-gray-900">{capitalize(key.replace(/_/g, ' '))}</h3>
                  {section?.agent && <Badge variant="outline">{capitalize(section.agent)} Agent</Badge>}
                </CardHeader>
                <CardContent>
                  {typeof section === 'string' ? (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{section}</p>
                  ) : section?.content ? (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{section.content}</p>
                  ) : (
                    <pre className="whitespace-pre-wrap text-xs text-gray-600 bg-gray-50 p-3 rounded-lg overflow-auto max-h-60 font-mono">
                      {JSON.stringify(section, null, 2)}
                    </pre>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Review Panel */}
      {showReview && (
        <Card className="mt-6 border-primary-200 print:hidden">
          <CardHeader><h3 className="text-sm font-semibold text-gray-900">Submit Review</h3></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmitReview)} className="space-y-4">
              <div className="flex gap-3">
                {(['approved', 'needs_revision', 'rejected'] as const).map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant="outline"
                    onClick={() => setValue('decision', d)}
                    className="flex-1"
                  >
                    {d === 'approved' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {d === 'needs_revision' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                    {d === 'rejected' && <XCircle className="h-4 w-4 text-red-600" />}
                    {capitalize(d)}
                  </Button>
                ))}
              </div>
              <input type="hidden" {...register('decision', { required: true })} />
              <Textarea label="Comments" placeholder="Add your review comments..." {...register('comments')} />
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowReview(false)}>Cancel</Button>
                <Button type="submit" disabled={submitReview.isPending}>
                  {submitReview.isPending ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
