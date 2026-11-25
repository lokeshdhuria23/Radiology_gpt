import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/context/AuthContext'
import { Button, Input } from '@/components/ui'
import {
  Stethoscope,
  AlertCircle,
  UserCog,
  Users,
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react'
import type { LoginRequest } from '@/types'

type Portal = 'doctor' | 'patient'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const passedPortal = (location.state as { portal?: Portal })?.portal
  const [portal, setPortal] = useState<Portal | null>(passedPortal || null)

  const { register, handleSubmit, setValue } = useForm<LoginRequest>({
    defaultValues: {
      email: (passedPortal === 'patient') ? 'patient@demo.com' : 'doctor@demo.com',
      password: 'password',
    },
  })

  const handleSelectPortal = (p: Portal) => {
    setPortal(p)
    setValue('email', p === 'patient' ? 'patient@demo.com' : 'doctor@demo.com')
    setValue('password', 'password')
  }

  const onSubmit = async (data: LoginRequest) => {
    setLoading(true)
    setError('')
    try {
      const loggedInUser = await login(data)
      const isPatientRole = loggedInUser?.role === 'patient' || portal === 'patient'
      if (isPatientRole) {
        if (loggedInUser?.patient_id) {
          navigate(`/patient?patientId=${loggedInUser.patient_id}`)
        } else {
          navigate('/patient')
        }
      } else {
        navigate('/dashboard')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Login failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Portal Selection Screen ──────────────────────────────────
  if (!portal) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-primary-950 px-4">
        {/* Background */}
        <div className="pointer-events-none fixed top-20 left-20 h-72 w-72 rounded-full bg-primary-500/8 blur-[100px]" />
        <div className="pointer-events-none fixed bottom-20 right-20 h-80 w-80 rounded-full bg-cyan-500/6 blur-[100px]" />

        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-400 to-cyan-500 shadow-lg shadow-primary-500/20">
            <Stethoscope className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">RadiologyGPT</h1>
          <p className="mt-1 text-sm text-gray-400">Choose your portal to continue</p>
        </div>

        {/* Portal Cards */}
        <div className="flex w-full max-w-lg flex-col gap-4 sm:flex-row">
          {/* Doctor Portal */}
          <button
            onClick={() => handleSelectPortal('doctor')}
            className="group flex flex-1 flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur transition-all hover:border-primary-500/40 hover:bg-white/[0.06] hover:-translate-y-1 cursor-pointer"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/15 text-primary-400 transition-colors group-hover:bg-primary-500/25">
              <UserCog className="h-8 w-8" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white">Doctor Portal</h2>
              <p className="mt-1 text-sm text-gray-400">
                Clinical dashboard, patient management, AI analysis & reports
              </p>
            </div>
          </button>

          {/* Patient Portal */}
          <button
            onClick={() => handleSelectPortal('patient')}
            className="group flex flex-1 flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur transition-all hover:border-cyan-500/40 hover:bg-white/[0.06] hover:-translate-y-1 cursor-pointer"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400 transition-colors group-hover:bg-cyan-500/25">
              <Users className="h-8 w-8" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white">Patient Portal</h2>
              <p className="mt-1 text-sm text-gray-400">
                Health records, AI health assistant & wellness insights
              </p>
            </div>
          </button>
        </div>
      </div>
    )
  }

  // ── Login Form ───────────────────────────────────────────────
  const isPatient = portal === 'patient'
  const accentColor = isPatient ? 'cyan' : 'primary'

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-primary-950 px-4">
      {/* Background */}
      <div className="pointer-events-none fixed top-20 left-20 h-72 w-72 rounded-full bg-primary-500/8 blur-[100px]" />
      <div className="pointer-events-none fixed bottom-20 right-20 h-80 w-80 rounded-full bg-cyan-500/6 blur-[100px]" />

      <button
        onClick={() => setPortal(null)}
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl shadow-2xl">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg ${
              isPatient
                ? 'bg-gradient-to-br from-cyan-400 to-teal-500 shadow-cyan-500/20'
                : 'bg-gradient-to-br from-primary-400 to-cyan-500 shadow-primary-500/20'
            }`}>
              {isPatient ? <Users className="h-7 w-7 text-white" /> : <UserCog className="h-7 w-7 text-white" />}
            </div>
            <h1 className="text-xl font-bold text-white">
              {isPatient ? 'Patient Portal' : 'Doctor Portal'}
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              {isPatient ? 'Access your health records & AI assistant' : 'Sign in to your clinical workspace'}
            </p>
          </div>

          {/* Portal Switcher Tabs */}
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-1">
            <button
              type="button"
              onClick={() => handleSelectPortal('doctor')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition cursor-pointer ${
                !isPatient
                  ? 'bg-primary-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <UserCog className="h-4 w-4" />
              Doctor Portal
            </button>
            <button
              type="button"
              onClick={() => handleSelectPortal('patient')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition cursor-pointer ${
                isPatient
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              Patient Portal
            </button>
          </div>

          {/* Quick Demo Credentials Pill */}
          <div className={`mb-5 rounded-xl border p-3 ${
            isPatient
              ? 'border-cyan-500/20 bg-cyan-500/10'
              : 'border-primary-500/20 bg-primary-500/10'
          }`}>
            {!isPatient ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-gray-300">
                  <span className="font-semibold text-primary-400">Doctor Demo:</span>{' '}
                  <span className="font-mono text-gray-200">doctor@demo.com</span>
                  <span className="mx-1 text-gray-500">•</span>
                  <span className="font-mono text-gray-400">password</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setValue('email', 'doctor@demo.com')
                    setValue('password', 'password')
                    onSubmit({ email: 'doctor@demo.com', password: 'password' })
                  }}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold text-white transition cursor-pointer shadow-sm bg-primary-600 hover:bg-primary-500"
                >
                  ⚡ 1-Click Login
                </button>
              </div>
            ) : (
              <div className="text-xs text-cyan-200/90 space-y-1">
                <p className="font-semibold text-cyan-300">Patient Self-Service Access:</p>
                <p className="text-[11px] text-gray-300">
                  Patients register via the <span className="font-medium text-cyan-300">Register for Patient Portal</span> link below. Once registered, you can log in using your <strong>Assigned MRN (MRN-XXXXXX)</strong>, <strong>Full Name</strong>, or <strong>Email</strong>.
                </p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-300">
                {isPatient ? 'Patient ID / MRN, Name, or Email *' : 'Physician Email or Username *'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder={isPatient ? 'e.g. MRN-408525, amit kumar, or patient@demo.com' : 'e.g. doctor@demo.com or Dr. Ashish'}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
                  {...register('email', { required: true })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
                  {...register('password', { required: true })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl py-3 text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-50 cursor-pointer ${
                isPatient
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 shadow-cyan-500/25 hover:shadow-cyan-500/40'
                  : 'bg-gradient-to-r from-primary-500 to-cyan-500 shadow-primary-500/25 hover:shadow-primary-500/40'
              }`}
            >
              {loading ? 'Signing in...' : `Sign In to ${isPatient ? 'Patient' : 'Doctor'} Portal`}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center text-xs text-gray-400">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/register', { state: { portal } })}
              className="font-medium text-primary-400 hover:text-primary-300 underline underline-offset-2 cursor-pointer"
            >
              Register for {isPatient ? 'Patient' : 'Doctor'} Portal
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="mt-6 text-center text-xs text-gray-600">
          ⚠️ AI-generated outputs are for decision support only
        </p>
      </div>
    </div>
  )
}
