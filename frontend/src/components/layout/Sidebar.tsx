import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useDoctorProfile, useUpdateDoctorSpecialty } from '@/hooks/useApi'
import {
  Users,
  Sparkles,
  Pill,
  Settings,
  LogOut,
  ChevronRight,
  ChevronUp,
  Check,
  PanelLeftClose,
  PanelLeft,
  Stethoscope,
} from 'lucide-react'

const SPECIALTIES = [
  'General',
  'Hospital Medicine',
  'Primary Care',
  'Emergency Medicine',
  'Pediatrics',
  'Critical Care',
  'Neurology',
  'Psychiatry',
  'Cardiology',
  'Radiology',
]

interface SidebarProps {
  isCollapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({
  isCollapsed = false,
  onToggle,
}: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const { data: profile } = useDoctorProfile()
  const updateSpecialty = useUpdateDoctorSpecialty()

  // Profile popover state
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isSpecialtyFlyoutOpen, setIsSpecialtyFlyoutOpen] = useState(false)
  const [activeSpecialty, setActiveSpecialty] = useState(profile?.specialty || 'Radiology')

  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (profile?.specialty) {
      setActiveSpecialty(profile.specialty)
    }
  }, [profile?.specialty])

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
        setIsSpecialtyFlyoutOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectSpecialty = async (sp: string) => {
    setActiveSpecialty(sp)
    try {
      await updateSpecialty.mutateAsync(sp)
    } catch {
      // optimistic update
    }
    setIsSpecialtyFlyoutOpen(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const doctorName = user?.full_name || profile?.first_name || 'Doctor'
  const initials = doctorName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join('') || 'DR'

  const navItems = [
    {
      name: 'Patients',
      path: '/patients',
      icon: Users,
      match: location.pathname === '/patients' || location.pathname.startsWith('/patients/'),
    },
    {
      name: 'AI Diagnostic Lab',
      path: '/diagnostic-lab',
      icon: Sparkles,
      match: location.pathname === '/diagnostic-lab',
    },
    {
      name: 'Medications',
      path: '/medications',
      icon: Pill,
      match: location.pathname === '/medications',
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
      match: location.pathname === '/settings',
    },
  ]

  // Collapsed sidebar toggle
  if (isCollapsed) {
    return (
      <button
        onClick={onToggle}
        className="fixed left-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50 transition cursor-pointer"
        title="Open Sidebar"
      >
        <PanelLeft className="h-4 w-4 text-gray-600" />
      </button>
    )
  }

  return (
    <>
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-gray-200/80 bg-white select-none">
        {/* Top Logo + Collapse Toggle */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div
            onClick={() => navigate('/patients')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-gray-900 block leading-tight">
                RadiologyGPT
              </span>
              <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block">
                Doctor Portal
              </span>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Main Navigation Links */}
        <div className="px-3 py-3 flex-1 overflow-y-auto space-y-1">
          <div className="px-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Clinical Hub
          </div>

          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition cursor-pointer ${
                  item.match
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${item.match ? 'text-blue-600' : 'text-gray-400'}`} />
                <span>{item.name}</span>
              </button>
            )
          })}
        </div>

        {/* Bottom Profile Section */}
        <div className="border-t border-gray-100 p-3 relative" ref={menuRef}>
          {/* Profile Popover Menu */}
          {isProfileMenuOpen && (
            <div className="absolute bottom-16 left-3 z-50 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              {/* Signed In Email */}
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 font-medium border-b border-gray-100 pb-2 mb-1">
                Signed in as <span className="normal-case text-gray-600 font-normal">{user?.email || 'doctor@demo.com'}</span>
              </div>

              {/* Menu items */}
              <div className="space-y-0.5 relative">
                {/* Specialty flyout trigger */}
                <div
                  onMouseEnter={() => setIsSpecialtyFlyoutOpen(true)}
                  onClick={() => setIsSpecialtyFlyoutOpen(!isSpecialtyFlyoutOpen)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  <span>Specialty: <strong className="text-gray-900">{activeSpecialty}</strong></span>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                </div>

                {/* Specialty Sub-Menu Flyout */}
                {isSpecialtyFlyoutOpen && (
                  <div
                    onMouseLeave={() => setIsSpecialtyFlyoutOpen(false)}
                    className="absolute left-[calc(100%+8px)] bottom-0 z-50 w-64 rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl"
                  >
                    <p className="text-xs font-semibold text-gray-900">Clinical Specialty</p>
                    <p className="text-[11px] text-gray-400 leading-snug mt-0.5 mb-2">
                      Sets the clinical perspective for diagnosis and recommendations.
                    </p>
                    <div className="max-h-64 overflow-y-auto space-y-0.5">
                      {SPECIALTIES.map((sp) => {
                        const isSelected = activeSpecialty === sp
                        return (
                          <button
                            key={sp}
                            onClick={() => handleSelectSpecialty(sp)}
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                          >
                            <span className={isSelected ? 'font-semibold text-gray-900' : ''}>
                              {sp}
                            </span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Settings Link */}
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false)
                    navigate('/settings')
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  <Settings className="h-3.5 w-3.5 text-gray-400" />
                  <span>Settings</span>
                </button>

                {/* Log Out */}
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5 text-red-400" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}

          {/* Left Bottom Doctor Card Trigger */}
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 hover:bg-gray-100/80 transition cursor-pointer"
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 font-bold text-xs text-white shadow-xs">
                {initials}
              </div>
              <div className="truncate text-left">
                <p className="truncate text-xs font-semibold text-gray-900 leading-tight">
                  {doctorName}
                </p>
                <p className="truncate text-[11px] text-gray-500 leading-tight">
                  {activeSpecialty}
                </p>
              </div>
            </div>

            <ChevronUp className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          </button>
        </div>
      </aside>
    </>
  )
}
