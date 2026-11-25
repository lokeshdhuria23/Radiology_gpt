import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/context/AuthContext'
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
  User,
  Award,
  Calendar,
  Phone,
  ShieldCheck,
} from 'lucide-react'
import type { RegisterRequest } from '@/types'

type Portal = 'doctor' | 'patient'

export default function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const passedPortal = (location.state as { portal?: Portal })?.portal
  const [portal, setPortal] = useState<Portal>(passedPortal || 'doctor')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterRequest>({
    defaultValues: {
      role: portal,
    },
  })

  const handlePortalSwitch = (newPortal: Portal) => {
    setPortal(newPortal)
    setError('')
    reset({
      role: newPortal,
    })
  }

  const onSubmit = async (data: RegisterRequest) => {
    setLoading(true)
    setError('')
    try {
      const payload: RegisterRequest = {
        ...data,
        role: portal,
        username: data.username || data.email.split('@')[0],
      }
      const newUser = await registerUser(payload)
      const userRole = newUser?.role || portal
      if (userRole === 'patient') {
        if (newUser?.patient_id) {
          navigate(`/patient?patientId=${newUser.patient_id}`)
        } else {
          navigate('/patient')
        }
      } else {
        navigate('/dashboard')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Registration failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const isPatient = portal === 'patient'

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-primary-950 px-4 py-12">
      {/* Background Orbs */}
      <div className="pointer-events-none fixed top-20 left-20 h-72 w-72 rounded-full bg-primary-500/8 blur-[100px]" />
      <div className="pointer-events-none fixed bottom-20 right-20 h-80 w-80 rounded-full bg-cyan-500/6 blur-[100px]" />

      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </button>

      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl shadow-2xl">
          {/* Header */}
          <div className="mb-6 text-center">
            <div
              className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg ${
                isPatient
                  ? 'bg-gradient-to-br from-cyan-400 to-teal-500 shadow-cyan-500/20'
                  : 'bg-gradient-to-br from-primary-400 to-cyan-500 shadow-primary-500/20'
              }`}
            >
              <Stethoscope className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Create Account</h1>
            <p className="mt-1 text-sm text-gray-400">
              Join RadiologyGPT AI Clinical Decision Support System
            </p>
          </div>

          {/* Portal Switcher Tabs */}
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-1">
            <button
              type="button"
              onClick={() => handlePortalSwitch('doctor')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition cursor-pointer ${
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
              onClick={() => handlePortalSwitch('patient')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition cursor-pointer ${
                isPatient
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              Patient Portal
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-300">
                {isPatient ? 'Full Legal Name *' : 'Physician Name (with title) *'}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder={isPatient ? 'e.g. John Doe' : 'e.g. Dr. Sarah Jenkins, MD'}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
                  {...register('full_name', { required: 'Full name is required' })}
                />
              </div>
              {errors.full_name && (
                <p className="text-xs text-red-400">{errors.full_name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-300">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  placeholder={isPatient ? 'your.email@example.com' : 'doctor@hospital.org'}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
                  {...register('email', { required: 'Email is required' })}
                />
              </div>
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-300">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Role-Specific Fields */}
            {!isPatient ? (
              // Doctor Fields
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-300">Specialty</label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-gray-900 py-2.5 px-3 text-sm text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
                    {...register('specialty')}
                  >
                    <option value="Diagnostic Radiology">Diagnostic Radiology</option>
                    <option value="Interventional Radiology">Interventional Radiology</option>
                    <option value="Pulmonology">Pulmonology</option>
                    <option value="Internal Medicine">Internal Medicine</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Emergency Medicine">Emergency Medicine</option>
                    <option value="General Practice">General Practice</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-300">License / NPI Number</label>
                  <div className="relative">
                    <Award className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder="e.g. MD-98234"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
                      {...register('license_number')}
                    />
                  </div>
                </div>
              </div>
            ) : (
              // Patient Fields
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-cyan-300">Consultation Department / Reason for Visit</label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-gray-900 py-2.5 px-3 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition"
                    {...register('consultation_type')}
                  >
                    <option value="Radiology">Radiology & Medical Imaging (X-Ray, CT, MRI, Ultrasound)</option>
                    <option value="Cardiology">Cardiology & Heart Care</option>
                    <option value="Pulmonology">Pulmonology & Respiratory Medicine</option>
                    <option value="General Medicine">General Medicine & Primary Care</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Orthopedics">Orthopedics & Joint Care</option>
                    <option value="Oncology">Oncology</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-300">Date of Birth</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      <input
                        type="date"
                        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-2 text-xs text-white placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
                        {...register('date_of_birth')}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-300">Sex / Gender</label>
                    <select
                      className="w-full rounded-xl border border-white/10 bg-gray-900 py-2.5 px-3 text-sm text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
                      {...register('sex')}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-300">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      <input
                        type="tel"
                        placeholder="555-0199"
                        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-2 text-sm text-white placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
                        {...register('phone')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="flex items-start gap-2 pt-2 text-[11px] text-gray-400">
              <ShieldCheck className="h-4 w-4 text-primary-400 flex-shrink-0 mt-0.5" />
              <span>
                By registering, you acknowledge that RadiologyGPT provides decision-support insights
                and does not replace licensed medical judgment.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl py-3 text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-50 cursor-pointer mt-4 ${
                isPatient
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 shadow-cyan-500/25 hover:shadow-cyan-500/40'
                  : 'bg-gradient-to-r from-primary-500 to-cyan-500 shadow-primary-500/25 hover:shadow-primary-500/40'
              }`}
            >
              {loading ? 'Creating Account...' : `Register for ${isPatient ? 'Patient' : 'Doctor'} Portal`}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center text-xs text-gray-400">
            Already have an account?{' '}
            <Link
              to="/login"
              state={{ portal }}
              className="font-medium text-primary-400 hover:text-primary-300 underline underline-offset-2"
            >
              Sign in to {isPatient ? 'Patient' : 'Doctor'} Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
