import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { usePatients } from '@/hooks/useApi'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, Button, Spinner, EmptyState, Badge } from '@/components/ui'
import { Search, User, ChevronRight, Stethoscope, Sparkles, UserCheck, RefreshCw } from 'lucide-react'
import { calculateAge } from '@/lib/utils'

export default function PatientListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const doctorSpecialty = user?.specialty || 'General'
  const rawDoctorName = user?.full_name || 'Doctor'
  const doctorDisplayName = rawDoctorName.toLowerCase().startsWith('dr.') || rawDoctorName.toLowerCase().startsWith('dr ')
    ? rawDoctorName
    : `Dr. ${rawDoctorName}`
  
  const [searchInput, setSearchInput] = useState('')
  const [activeSearch, setActiveSearch] = useState('')

  const { data: rawPatients, isLoading, refetch } = usePatients(activeSearch || undefined)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveSearch(searchInput.trim())
  }

  const handleClearSearch = () => {
    setSearchInput('')
    setActiveSearch('')
  }

  const patients = useMemo(() => {
    if (!rawPatients) return []
    return rawPatients
  }, [rawPatients])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Patients"
        description="Clinical roster & patient registry (Registered via Patient Portal)"
        actions={
          <Button onClick={() => refetch()} variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
            <RefreshCw className="h-4 w-4 text-gray-500" />
            <span>Refresh Roster</span>
          </Button>
        }
      />

      {/* Specialty Banner */}
      <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-xs text-blue-900 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <Stethoscope className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              Department: <span className="text-blue-700">{doctorSpecialty}</span>
            </p>
            <p className="text-gray-500 text-[11px]">
              Assigned Clinician: <span className="font-medium text-gray-700">{doctorDisplayName}</span>
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-white text-blue-700 border-blue-200 font-semibold px-2.5 py-1">
          {patients.length} Registered {patients.length === 1 ? 'Patient' : 'Patients'}
        </Badge>
      </div>

      {/* Search Bar with Dedicated Search Button */}
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search patients by name, MRN, patient ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 shadow-xs placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
          />
        </div>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer active:scale-98"
        >
          <Search className="h-4 w-4" />
          <span>Search</span>
        </button>
        {activeSearch && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            Clear
          </button>
        )}
      </form>

      {/* Patient Cards Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : patients.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {patients.map((p) => {
            const age = calculateAge(p.date_of_birth)
            const id = p.patient_identifier || p.medical_record_number || p.id
            const gender = (p.sex || p.gender || 'Unknown').toUpperCase()
            const name = p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Patient'

            return (
              <Card
                key={p.id}
                className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg cursor-pointer"
                onClick={() => navigate(`/patients/${p.id}`)}
              >
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div>
                    {/* Top Row: Avatar & Name */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-base text-white shadow-sm">
                          {name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-gray-900 group-hover:text-blue-600 transition leading-tight">
                            {name}
                          </h3>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            ID: <span className="font-semibold text-gray-700">{id}</span>
                          </p>
                        </div>
                      </div>
                      <Badge variant="success" className="text-[10px] font-semibold">
                        Active
                      </Badge>
                    </div>

                    {/* Separated Patient Attributes */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
                      <div className="rounded-xl bg-gray-50/80 p-2.5 border border-gray-100">
                        <span className="text-[10px] uppercase font-semibold text-gray-400 block tracking-wider">
                          Age
                        </span>
                        <span className="font-bold text-gray-800 text-sm">
                          {age} <span className="text-xs font-normal text-gray-500">years</span>
                        </span>
                      </div>

                      <div className="rounded-xl bg-gray-50/80 p-2.5 border border-gray-100">
                        <span className="text-[10px] uppercase font-semibold text-gray-400 block tracking-wider">
                          Gender
                        </span>
                        <span className="font-bold text-gray-800 text-sm">
                          {gender}
                        </span>
                      </div>
                    </div>

                    {/* Specialty & Contact Info */}
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1 font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        {p.specialty || p.consultation_type || 'Radiology'}
                      </span>
                      {p.phone && (
                        <span className="truncate max-w-[140px] text-gray-400">
                          {p.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/diagnostic-lab?patientId=${p.id}`)
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>AI Diagnostic Lab</span>
                    </button>

                    <div className="flex items-center text-xs font-medium text-gray-400 group-hover:text-blue-600 transition">
                      <span>View Profile</span>
                      <ChevronRight className="h-4 w-4 ml-0.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={User}
          title={activeSearch ? `No patients matching "${activeSearch}"` : 'No registered patients yet'}
          description={
            activeSearch
              ? 'Try searching with another name or MRN'
              : 'Patients self-register through the Patient Portal. Once registered, their profiles and records appear here automatically.'
          }
          action={
            <Button onClick={() => refetch()} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
              Refresh Patient Roster
            </Button>
          }
        />
      )}
    </div>
  )
}
