import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDoctorProfile, useUpdateDoctorProfile, usePatients } from '@/hooks/useApi'
import {
  Home,
  User,
  List,
  Check,
  ChevronDown,
  Loader2,
  ExternalLink,
  Stethoscope,
} from 'lucide-react'

type SettingsTab = 'account' | 'patient_lists'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { data: profile, isLoading } = useDoctorProfile()
  const updateProfile = useUpdateDoctorProfile()
  const { data: patientsData } = usePatients()

  const [activeTab, setActiveTab] = useState<SettingsTab>('account')

  // Account form state
  const [practiceCountry, setPracticeCountry] = useState('India (detected)')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [degreeType, setDegreeType] = useState('MD')
  const [institution, setInstitution] = useState('Metropolitan Hospital')
  const [practiceType, setPracticeType] = useState('Academic Medical Center')
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (profile) {
      if (profile.practice_country) setPracticeCountry(profile.practice_country)
      if (profile.first_name) setFirstName(profile.first_name)
      if (profile.last_name) setLastName(profile.last_name)
      if (profile.degree_type) setDegreeType(profile.degree_type)
      if (profile.institution) setInstitution(profile.institution)
      if (profile.practice_type) setPracticeType(profile.practice_type)
    }
  }, [profile])

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveSuccess(false)
    try {
      await updateProfile.mutateAsync({
        practice_country: practiceCountry,
        first_name: firstName,
        last_name: lastName,
        degree_type: degreeType,
        institution,
        practice_type: practiceType,
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      // optimistic
    }
  }

  const patients = Array.isArray(patientsData) ? patientsData : (patientsData as any)?.items || []

  return (
    <div className="flex h-screen bg-white text-gray-900 select-none">
      {/* Left Settings Sidebar */}
      <div className="w-64 border-r border-gray-200/80 bg-[#fbfbfb] flex flex-col justify-between p-4">
        <div>
          {/* Header with logo */}
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition cursor-pointer"
              title="Back to Encounter Workspace"
            >
              <Home className="h-4 w-4" />
              <span className="text-xs font-medium">Workspace</span>
            </button>
          </div>

          {/* Top Logo */}
          <div className="flex items-center gap-2 px-2 mb-6">
            <Stethoscope className="h-5 w-5 text-blue-600" />
            <span className="font-bold text-sm text-gray-900">RadiologyGPT</span>
          </div>

          <h1 className="text-lg font-bold text-gray-900 px-2 mb-4">Settings</h1>

          {/* Personal Section (Only Account & Patient lists as requested) */}
          <div className="space-y-1">
            <p className="px-2 pb-1 text-xs font-semibold text-gray-400">Personal</p>

            <button
              onClick={() => setActiveTab('account')}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition cursor-pointer ${
                activeTab === 'account'
                  ? 'border border-gray-900/10 bg-white shadow-xs text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900'
              }`}
            >
              <User className="h-4 w-4 text-gray-400" />
              <span>Account</span>
            </button>

            <button
              onClick={() => setActiveTab('patient_lists')}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition cursor-pointer ${
                activeTab === 'patient_lists'
                  ? 'border border-gray-900/10 bg-white shadow-xs text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4 text-gray-400" />
              <span>Patient lists</span>
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200/60 pt-3 px-2 text-[11px] text-gray-400">
          RadiologyGPT Clinical Suite v1.0
        </div>
      </div>

      {/* Main Settings Content */}
      <div className="flex-1 overflow-y-auto px-12 py-10 max-w-4xl">
        {activeTab === 'account' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">Account</h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage your clinical credentialing, institution, and practice information.
              </p>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                  Basic Information
                </h3>
              </div>

              {/* Practice Country */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Practice country</label>
                <div className="relative">
                  <select
                    value={practiceCountry}
                    onChange={(e) => setPracticeCountry(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition"
                  >
                    <option value="India (detected)">India (detected)</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Germany">Germany</option>
                    <option value="Singapore">Singapore</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* First & Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First Name"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last Name"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition"
                  />
                </div>
              </div>

              {/* Degree Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Degree Type</label>
                <div className="relative">
                  <select
                    value={degreeType}
                    onChange={(e) => setDegreeType(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition"
                  >
                    <option value="MD">MD (Doctor of Medicine)</option>
                    <option value="MBBS">MBBS (Bachelor of Medicine & Surgery)</option>
                    <option value="DO">DO (Doctor of Osteopathic Medicine)</option>
                    <option value="MS">MS (Master of Surgery)</option>
                    <option value="PhD">PhD / Researcher</option>
                    <option value="NP">Nurse Practitioner (NP)</option>
                    <option value="PA">Physician Assistant (PA)</option>
                    <option value="Other">Other Healthcare Professional</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Institution */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Institution</label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Search for your institution..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition"
                />
              </div>

              {/* Practice Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Practice type</label>
                <div className="relative">
                  <select
                    value={practiceType}
                    onChange={(e) => setPracticeType(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition"
                  >
                    <option value="Academic Medical Center">Academic Medical Center</option>
                    <option value="Community Hospital">Community Hospital</option>
                    <option value="Private Practice">Private Practice</option>
                    <option value="Outpatient Clinic">Outpatient Clinic</option>
                    <option value="Teleradiology Group">Teleradiology Group</option>
                    <option value="Government / VA">Government / VA</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50 transition cursor-pointer"
                >
                  {updateProfile.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>

                {saveSuccess && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 animate-in fade-in">
                    <Check className="h-4 w-4" /> Changes saved
                  </span>
                )}
              </div>
            </form>
          </div>
        )}

        {activeTab === 'patient_lists' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">Patient lists</h2>
              <p className="mt-1 text-sm text-gray-500">Restore or duplicate archived patient lists</p>
            </div>

            {/* Empty State */}
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-12 text-center my-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-xs border border-gray-100 text-gray-400">
                <List className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-gray-900">No archived patient lists</h3>
              <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                Archived lists appear here so you can restore them or duplicate their structure later.
              </p>
            </div>

            {/* Active Patients Overview */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Active Patient Roster</h3>
                <span className="text-xs text-gray-500">{patients.length} patients</span>
              </div>

              <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xs">
                {patients.slice(0, 6).map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/80 transition"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.full_name}</p>
                      <p className="text-xs text-gray-500">
                        MRN: {p.patient_identifier || p.medical_record_number} • {p.specialty || 'General'}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/patients/${p.id}`)}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                    >
                      <span>Open Record</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
