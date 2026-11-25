import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAllEncounters, usePatients } from '@/hooks/useApi'
import { Search, X, FileText, User, ArrowRight } from 'lucide-react'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectEncounter?: (id: string) => void
}

export function SearchModal({ isOpen, onClose, onSelectEncounter }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { data: encountersData } = useAllEncounters()
  const { data: patientsData } = usePatients(query)

  if (!isOpen) return null

  const encounters = encountersData || []
  const patients = Array.isArray(patientsData) ? patientsData : (patientsData as any)?.items || []

  const filteredEncounters = encounters.filter((enc: any) =>
    (enc.title || '').toLowerCase().includes(query.toLowerCase()) ||
    (enc.patient_name || '').toLowerCase().includes(query.toLowerCase()) ||
    (enc.overview?.summary || '').toLowerCase().includes(query.toLowerCase())
  )

  const handleSelectEnc = (id: string) => {
    if (onSelectEncounter) {
      onSelectEncounter(id)
    } else {
      navigate(`/dashboard?encounter=${id}`)
    }
    onClose()
  }

  const handleSelectPatient = (id: string) => {
    navigate(`/patients/${id}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search encounters, patient records, clinical notes..."
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {/* Encounters Section */}
          <div>
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Encounters ({filteredEncounters.length})
            </p>
            {filteredEncounters.length > 0 ? (
              <div className="space-y-1">
                {filteredEncounters.slice(0, 6).map((enc: any) => (
                  <button
                    key={enc.id}
                    onClick={() => handleSelectEnc(enc.id)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-gray-50 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="truncate">
                        <p className="truncate text-sm font-medium text-gray-900 group-hover:text-primary-600">
                          {enc.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          {enc.patient_name} • {enc.time_label || 'Recent'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 transition" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-2 py-2 text-xs text-gray-400">No matching encounters found</p>
            )}
          </div>

          {/* Patients Section */}
          <div>
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Patients ({patients.length})
            </p>
            {patients.length > 0 ? (
              <div className="space-y-1">
                {patients.slice(0, 5).map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPatient(p.id)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-gray-50 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="truncate">
                        <p className="truncate text-sm font-medium text-gray-900 group-hover:text-cyan-600">
                          {p.full_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          MRN: {p.patient_identifier || p.medical_record_number} • {p.specialty || 'General'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 transition" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-2 py-2 text-xs text-gray-400">No matching patients</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-2.5 text-right text-[11px] text-gray-400">
          Press <kbd className="rounded bg-white px-1.5 py-0.5 border border-gray-200 font-mono text-gray-600">Esc</kbd> to exit
        </div>
      </div>
    </div>
  )
}
