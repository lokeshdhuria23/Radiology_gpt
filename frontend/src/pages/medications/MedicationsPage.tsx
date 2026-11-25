import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { usePatients } from '@/hooks/useApi'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, Button, Badge, Spinner, EmptyState } from '@/components/ui'
import {
  Pill,
  Sparkles,
  Search,
  Filter,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import api from '@/lib/api'

export default function MedicationsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const filterPatientParam = searchParams.get('patientId') || 'ALL'

  const rawDoctorName = user?.full_name || user?.username || 'Ashish'
  const doctorDisplayName = rawDoctorName.toLowerCase().startsWith('dr.') || rawDoctorName.toLowerCase().startsWith('dr ')
    ? rawDoctorName
    : `Dr. ${rawDoctorName}`

  const { data: patientsData } = usePatients()
  const patients = Array.isArray(patientsData) ? patientsData : (patientsData as any)?.items || []

  const [selectedPatientFilter, setSelectedPatientFilter] = useState(filterPatientParam)
  const [searchTerm, setSearchTerm] = useState('')
  const [medications, setMedications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (filterPatientParam) {
      setSelectedPatientFilter(filterPatientParam)
    }
  }, [filterPatientParam])

  const fetchMedications = async () => {
    setIsLoading(true)
    try {
      const params: any = {}
      if (selectedPatientFilter && selectedPatientFilter !== 'ALL') {
        params.patient_id = selectedPatientFilter
      }
      const res = await api.get('/clinical/medications', { params })
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || [])
      setMedications(items)
    } catch (e) {
      console.warn('Could not fetch global medications, checking patient list:', e)
      setMedications([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMedications()
  }, [selectedPatientFilter])

  // Client-side search filter
  const filteredMeds = medications.filter((m) => {
    const q = searchTerm.toLowerCase()
    const medName = (m.medication_name || '').toLowerCase()
    const pName = (m.patient_name || '').toLowerCase()
    const pId = (m.patient_identifier || '').toLowerCase()
    return medName.includes(q) || pName.includes(q) || pId.includes(q)
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        title="Patient Prescriptions & Medications"
        description="Active pharmaceutical regimens and clinical decision support prescriptions"
        actions={
          <Button
            onClick={() => navigate('/diagnostic-lab')}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            <span>Prescribe via AI Lab</span>
          </Button>
        }
      />

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by medicine name, patient name, or MRN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-10 pr-4 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none transition"
          />
        </div>

        {/* Patient Dropdown Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Filter Patient:</span>
          <select
            value={selectedPatientFilter}
            onChange={(e) => setSelectedPatientFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Registered Patients</option>
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
        </div>
      </div>

      {/* Medications List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filteredMeds.length > 0 ? (
        <div className="space-y-4">
          {filteredMeds.map((med: any) => (
            <Card
              key={med.id}
              className="rounded-2xl border border-gray-200/90 bg-white shadow-xs hover:border-blue-200 hover:shadow-md transition duration-200 overflow-hidden"
            >
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  {/* Top: Patient Tag & Status */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                      <User className="h-3 w-3" />
                      <span>{med.patient_name || 'Patient'}</span>
                      {med.patient_identifier && (
                        <span className="font-mono text-[10px] text-blue-500">({med.patient_identifier})</span>
                      )}
                    </span>

                    <Badge variant="success" className="text-[10px] font-semibold">
                      {med.status || 'Active'}
                    </Badge>

                    <span className="text-[11px] text-gray-400">
                      Prescribed: {formatDate(med.created_at || med.start_date)}
                    </span>
                  </div>

                  {/* Medicine Name */}
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <Pill className="h-4 w-4 text-blue-600" />
                      <span>{med.medication_name}</span>
                    </h3>
                  </div>

                  {/* Dosage & Frequency Badges */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
                      Dosage: <strong className="text-gray-900">{med.dosage || 'As directed'}</strong>
                    </span>
                    <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
                      Frequency: <strong className="text-gray-900">{med.frequency || 'Daily'}</strong>
                    </span>
                    {med.route && (
                      <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
                        Route: <strong className="text-gray-900">{med.route}</strong>
                      </span>
                    )}
                  </div>

                  {/* Instructions */}
                  {(med.instructions || med.notes) && (
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-100 font-sans italic">
                      "{med.instructions || med.notes}"
                    </p>
                  )}
                </div>

                {/* Right Doctor Action */}
                <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-gray-100 gap-2 shrink-0">
                  <span className="text-[11px] text-gray-400 font-medium">
                    Attending: {doctorDisplayName}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/patients/${med.patient_id}`)}
                    className="text-xs"
                  >
                    View Patient Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Pill}
          title="No prescriptions found"
          description={
            searchTerm
              ? `No medications matching "${searchTerm}"`
              : 'Prescriptions issued in the AI Diagnostic Lab will automatically populate here.'
          }
          action={
            <Button
              onClick={() => navigate('/diagnostic-lab')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Sparkles className="h-4 w-4 mr-1.5" /> Prescribe via AI Lab
            </Button>
          }
        />
      )}
    </div>
  )
}
