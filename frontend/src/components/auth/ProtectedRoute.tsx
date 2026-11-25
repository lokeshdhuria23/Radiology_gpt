import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/welcome" state={{ from: location }} replace />
  }

  // If role check is needed
  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    // If a patient attempts to access doctor workspace, redirect to patient portal
    if (user.role === 'patient') {
      return <Navigate to="/patient" replace />
    }
    // If a doctor tries to access an unauthorized route, redirect to dashboard
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
