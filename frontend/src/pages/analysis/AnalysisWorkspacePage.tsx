import { useParams, useNavigate } from 'react-router-dom'
import { useWorkflow, useAgentRuns, usePatient } from '@/hooks/useApi'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Card, CardContent, CardHeader, Badge, Button, Spinner, EmptyState,
  StatusIndicator, ProgressBar,
} from '@/components/ui'
import {
  ArrowLeft, Brain, Clock, CheckCircle2, XCircle, AlertCircle,
  FileText, Shield, Stethoscope, Eye, Languages, Microscope,
} from 'lucide-react'
import { formatDateTime, capitalize } from '@/lib/utils'

const AGENT_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  history: { icon: Clock, label: 'Longitudinal History', color: 'text-blue-600 bg-blue-50' },
  safety: { icon: Shield, label: 'Clinical Safety', color: 'text-red-600 bg-red-50' },
  scribe: { icon: Stethoscope, label: 'Intake & Scribe', color: 'text-green-600 bg-green-50' },
  perception: { icon: Eye, label: 'Perception & OCR', color: 'text-purple-600 bg-purple-50' },
  translation: { icon: Languages, label: 'Medical Translation', color: 'text-amber-600 bg-amber-50' },
  specialist: { icon: Microscope, label: 'Specialist Analysis', color: 'text-cyan-600 bg-cyan-50' },
}

export default function AnalysisWorkspacePage() {
  const { workflowId } = useParams<{ workflowId: string }>()
  const navigate = useNavigate()
  const { data: workflow, isLoading } = useWorkflow(workflowId!)
  const { data: rawAgents } = useAgentRuns(workflowId!)
  const { data: patient } = usePatient(workflow?.patient_id || '')

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!workflow) return <EmptyState title="Workflow not found" />

  const agents = Array.isArray(rawAgents)
    ? rawAgents
    : (rawAgents && typeof rawAgents === 'object' && Array.isArray((rawAgents as any).items))
      ? (rawAgents as any).items
      : []

  const completedCount = agents.filter((a: any) => a.status === 'completed' || a.execution_status === 'completed').length
  const totalCount = agents.length || 6
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const wfStatus = workflow.status || (workflow as any).workflow_status || 'completed'

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 cursor-pointer">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <PageHeader
        title="AI Analysis"
        description={patient ? `${patient.first_name || patient.full_name || 'Patient'} — ${capitalize(workflow.workflow_type || 'full')} analysis` : 'Analysis in progress'}
        actions={
          (wfStatus === 'completed' || wfStatus === 'running') && (
            <Button onClick={() => navigate(`/reports/${workflowId}`)}>
              <FileText className="h-4 w-4" /> View Report
            </Button>
          )
        }
      />

      {/* Status Bar */}
      <Card className="mb-6">
        <CardContent className="py-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-primary-600" />
              <span className="text-sm font-medium text-gray-900">
                {wfStatus === 'running' ? 'Analysis in progress...' :
                 wfStatus === 'completed' ? 'Analysis complete' :
                 wfStatus === 'failed' ? 'Analysis failed' : capitalize(wfStatus)}
              </span>
            </div>
            <Badge
              variant={wfStatus === 'completed' ? 'success' : wfStatus === 'failed' ? 'danger' : wfStatus === 'running' ? 'default' : 'secondary'}
            >
              {capitalize(wfStatus)}
            </Badge>
          </div>
          <ProgressBar value={progress} />
          <p className="mt-2 text-xs text-gray-500">{completedCount} of {totalCount} agents completed</p>
        </CardContent>
      </Card>

      {/* Agent Runs */}
      <div className="space-y-4">
        {agents.length ? agents.map((agent: any) => {
          const typeKey = (agent.agent_type || agent.agent_name || '').replace('_agent', '')
          const meta = AGENT_META[typeKey] || { icon: Brain, label: capitalize(typeKey || 'Clinical Agent'), color: 'text-gray-600 bg-gray-50' }
          const Icon = meta.icon
          const status = agent.status || agent.execution_status || 'completed'

          return (
            <Card key={agent.id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{meta.label}</h3>
                      {agent.is_demo_mode && <Badge variant="warning">Demo</Badge>}
                      <Badge
                        variant={status === 'completed' ? 'success' : status === 'failed' ? 'danger' : status === 'running' ? 'default' : 'secondary'}
                      >
                        <StatusIndicator status={status} />
                        <span className="ml-1.5">{capitalize(status)}</span>
                      </Badge>
                    </div>

                    {agent.execution_time_ms && (
                      <p className="mt-1 text-xs text-gray-500">
                        Completed in {(agent.execution_time_ms / 1000).toFixed(1)}s
                        {agent.model_used && ` • Model: ${agent.model_used}`}
                      </p>
                    )}

                    {agent.status === 'completed' && agent.output_data && (
                      <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
                        <pre className="whitespace-pre-wrap text-xs text-gray-700 max-h-60 overflow-auto">
                          {typeof agent.output_data === 'string'
                            ? agent.output_data
                            : JSON.stringify(agent.output_data, null, 2)}
                        </pre>
                      </div>
                    )}

                    {agent.status === 'failed' && agent.error_message && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                        <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700">{agent.error_message}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        }) : (
          <EmptyState icon={Brain} title="Waiting for agents..." description="Agent runs will appear here" />
        )}
      </div>
    </div>
  )
}
