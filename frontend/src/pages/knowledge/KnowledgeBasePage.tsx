import { useState } from 'react'
import { useKnowledgeSources, useKnowledgeDocuments } from '@/hooks/useApi'
import { knowledgeService } from '@/services/api'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Card, CardContent, CardHeader, Button, Input, Badge, Dialog,
  Spinner, EmptyState, FileUpload,
} from '@/components/ui'
import { Plus, BookOpen, FileText, Database } from 'lucide-react'
import { formatDate, capitalize } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

export default function KnowledgeBasePage() {
  const { data: sources, isLoading } = useKnowledgeSources()
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [showAddSource, setShowAddSource] = useState(false)
  const { data: documents } = useKnowledgeDocuments(selectedSource || '')
  const qc = useQueryClient()

  const { register, handleSubmit, reset } = useForm<{ name: string; source_type: string; description: string }>()

  const onAddSource = async (data: { name: string; source_type: string; description: string }) => {
    await knowledgeService.createSource(data)
    qc.invalidateQueries({ queryKey: ['knowledgeSources'] })
    setShowAddSource(false)
    reset()
  }

  const handleUpload = async (files: FileList) => {
    if (!selectedSource) return
    for (const file of Array.from(files)) {
      await knowledgeService.uploadDocument(selectedSource, file, file.name)
    }
    qc.invalidateQueries({ queryKey: ['knowledgeDocs', selectedSource] })
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        description="Manage medical knowledge sources for RAG retrieval"
        actions={
          <Button onClick={() => setShowAddSource(true)}>
            <Plus className="h-4 w-4" /> Add Source
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sources */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Sources</h3>
          {sources?.length ? sources.map(s => (
            <Card
              key={s.id}
              className={`cursor-pointer transition-shadow hover:shadow-md ${selectedSource === s.id ? 'ring-2 ring-primary-500' : ''}`}
              onClick={() => setSelectedSource(s.id)}
            >
              <CardContent className="flex items-center gap-3 py-3">
                <Database className="h-5 w-5 text-primary-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-500">{capitalize(s.source_type)}</p>
                </div>
                <Badge variant={s.is_active ? 'success' : 'secondary'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
              </CardContent>
            </Card>
          )) : (
            <EmptyState icon={BookOpen} title="No sources" description="Add a knowledge source to get started" />
          )}
        </div>

        {/* Documents */}
        <div className="lg:col-span-2">
          {selectedSource ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Documents</h3>
              <FileUpload
                onFiles={handleUpload}
                accept=".pdf,.txt,.md,.csv,.json"
                multiple
                className="mb-4"
              />
              {documents?.length ? (
                <div className="space-y-3">
                  {documents.map(d => (
                    <Card key={d.id}>
                      <CardContent className="flex items-center gap-3 py-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{d.title}</p>
                          <p className="text-xs text-gray-500">
                            {d.chunk_count} chunks • {formatDate(d.created_at)}
                          </p>
                        </div>
                        <Badge variant={d.is_indexed ? 'success' : 'secondary'}>
                          {d.is_indexed ? 'Indexed' : 'Pending'}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState icon={FileText} title="No documents" description="Upload documents to this source" />
              )}
            </div>
          ) : (
            <EmptyState icon={BookOpen} title="Select a source" description="Choose a knowledge source to view its documents" />
          )}
        </div>
      </div>

      <Dialog open={showAddSource} onClose={() => setShowAddSource(false)} title="Add Knowledge Source">
        <form onSubmit={handleSubmit(onAddSource)} className="space-y-4">
          <Input label="Name *" {...register('name', { required: true })} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select className="flex h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm" {...register('source_type')}>
              <option value="medical_reference">Medical Reference</option>
              <option value="clinical_guidelines">Clinical Guidelines</option>
              <option value="drug_database">Drug Database</option>
              <option value="research_papers">Research Papers</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <Input label="Description" {...register('description')} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowAddSource(false)}>Cancel</Button>
            <Button type="submit">Create Source</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
