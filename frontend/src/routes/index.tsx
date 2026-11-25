import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import PatientListPage from '@/pages/patients/PatientListPage'
import PatientProfilePage from '@/pages/patients/PatientProfilePage'
import DiagnosticLabPage from '@/pages/lab/DiagnosticLabPage'
import MedicationsPage from '@/pages/medications/MedicationsPage'
import PatientPortalPage from '@/pages/patient/PatientPortalPage'
import SettingsPage from '@/pages/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/welcome',
    element: <Navigate to="/" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/patient',
    element: (
      <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin']}>
        <PatientPortalPage />
      </ProtectedRoute>
    ),
  },
  {
    element: (
      <ProtectedRoute allowedRoles={['doctor', 'admin']}>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <Navigate to="/patients" replace /> },
      { path: 'patients', element: <PatientListPage /> },
      { path: 'patients/:patientId', element: <PatientProfilePage /> },
      { path: 'diagnostic-lab', element: <DiagnosticLabPage /> },
      { path: 'medications', element: <MedicationsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
