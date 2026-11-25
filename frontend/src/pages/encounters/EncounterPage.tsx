import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEncounter, usePatient, useStartWorkflow } from '@/hooks/useApi'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Card, CardContent, CardHeader, Badge, Button, Spinner, EmptyState, Tabs,
} from '@/components/ui'
import { ArrowLeft, Brain, Calendar, FileText, Stethoscope } from 'lucide-react'
import { formatDateTime, capitalize } from '@/lib/utils'
import {
  useVitals,
  useClinicalNotes,
  useCreateClinicalNote,
} from '@/hooks/useApi'
import { Textarea } from '@/components/ui'
import { useForm } from 'react-hook-form'
import type { ClinicalNoteCreate } from '@/types'

export default function EncounterPage() {
  const { patientId, encounterId } = useParams<{ patientId: string; encounterId: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState('details')

  const { data: encounter, isLoading } = useEncounter(patientId!, encounterId!)
  const { data: patient } = usePatient(patientId!)
  const { data: vitals } = useVitals(patientId!)
  const { data: notes } = useClinicalNotes(patientId!)
  const createNote = useCreateClinicalNote(patientId!)
  const startWorkflow = useStartWorkflow()

  const { register, handleSubmit, reset } = useForm<{ content: string; note_type: string }>()

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!encounter) return <EmptyState title="Encounter not found" />

  const encounterVitals = vitals?.filter(v => v.encounter_id === encounterId) || []
  const encounterNotes = notes?.filter((n: any) => n.encounter_id === encounterId) || []

  const handleAnalysis = async () => {
    try {
      const wf = await startWorkflow.mutateAsync({
        patientId: patientId!,
        encounterId: encounterId!,
      })
      navigate(`/analysis/${wf.id}`)
    } catch { /* handle */ }
  }

  const onAddNote = async (data: { content: string; note_type: string }) => {
    await createNote.mutateAsync({
      encounter_id: encounterId!,
      note_type: data.note_type || 'progress',
      content: data.content,
    })
    reset()
  }

  return (
    <div>
      <button onClick={() => navigate(`/patients/${patientId}`)} className="mb-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 cursor-pointer">
        <ArrowLeft className="h-4 w-4" /> Back to Patient
      </button>

      <PageHeader
        title={`${capitalize(encounter.encounter_type)} Encounter`}
        description={patient ? `${patient.first_name} ${patient.last_name} — ${formatDateTime(encounter.visit_date || encounter.created_at)}` : ''}
        actions={
          <Button onClick={handleAnalysis} disabled={startWorkflow.isPending}>
            <Brain className="h-4 w-4" />
            {startWorkflow.isPending ? 'Starting...' : 'Run AI Analysis'}
          </Button>
        }
      />

      <Tabs
        tabs={[
          { id: 'details', label: 'Details' },
          { id: 'vitals', label: 'Vitals', count: encounterVitals.length },
          { id: 'notes', label: 'Notes', count: encounterNotes.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-6">
        {tab === 'details' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><h3 className="text-sm font-semibold">Encounter Details</h3></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium">{capitalize(encounter.encounter_type)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <Badge variant={encounter.status === 'active' ? 'success' : 'secondary'}>{encounter.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Visit Date</span>
                  <span className="font-medium">{formatDateTime(encounter.visit_date || encounter.created_at)}</span>
                </div>
                {encounter.discharge_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Discharge Date</span>
                    <span className="font-medium">{formatDateTime(encounter.discharge_date)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><h3 className="text-sm font-semibold">Chief Complaint</h3></CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">
                  {encounter.chief_complaint || 'No chief complaint recorded'}
                </p>
                {encounter.notes && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{encounter.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === 'vitals' && (
          encounterVitals.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="pb-3 font-medium text-gray-500">Date</th>
                    <th className="pb-3 font-medium text-gray-500">Temp</th>
                    <th className="pb-3 font-medium text-gray-500">HR</th>
                    <th className="pb-3 font-medium text-gray-500">BP</th>
                    <th className="pb-3 font-medium text-gray-500">RR</th>
                    <th className="pb-3 font-medium text-gray-500">SpO₂</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {encounterVitals.map(v => (
                    <tr key={v.id}>
                      <td className="py-3">{formatDateTime(v.recorded_at)}</td>
                      <td className="py-3">{v.temperature ?? '—'}</td>
                      <td className="py-3">{v.heart_rate ?? '—'}</td>
                      <td className="py-3">{v.blood_pressure_systolic && v.blood_pressure_diastolic ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}` : '—'}</td>
                      <td className="py-3">{v.respiratory_rate ?? '—'}</td>
                      <td className="py-3">{v.oxygen_saturation ? `${v.oxygen_saturation}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Stethoscope} title="No vitals recorded for this encounter" />
          )
        )}

        {tab === 'notes' && (
          <div>
            {/* Add Note */}
            <Card className="mb-6">
              <CardHeader><h3 className="text-sm font-semibold">Add Clinical Note</h3></CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onAddNote)} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Note Type</label>
                    <select className="flex h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm" {...register('note_type')}>
                      <option value="progress">Progress Note</option>
                      <option value="soap">SOAP Note</option>
                      <option value="history">History</option>
                      <option value="assessment">Assessment</option>
                      <option value="plan">Plan</option>
                    </select>
                  </div>
                  <Textarea placeholder="Enter clinical note..." {...register('content', { required: true })} />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={createNote.isPending}>
                      {createNote.isPending ? 'Adding...' : 'Add Note'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Existing Notes */}
            {encounterNotes.length ? (
              <div className="space-y-3">
                {encounterNotes.map((n: any) => (
                  <Card key={n.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={n.is_ai_generated ? 'warning' : 'outline'}>
                          {n.is_ai_generated ? 'AI Generated' : capitalize(n.note_type)}
                        </Badge>
                        <span className="text-xs text-gray-400">{formatDateTime(n.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{n.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState icon={FileText} title="No notes for this encounter" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
