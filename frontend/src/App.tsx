import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import { useEffect } from 'react'

// Layout Components
import { Layout } from './components/layout/Layout'
import { AuthLayout } from './components/layout/AuthLayout'

// Page Components
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { MFAPage } from './pages/auth/MFAPage'

// Dashboard
import { DashboardPage } from './pages/dashboard/DashboardPage'

// Modules
import { DomainsPage } from './pages/domains/DomainsPage'
import { DomainDetailsPage } from './pages/domains/DomainDetailsPage'
import { CreateDomainPage } from './pages/domains/CreateDomainPage'

import { DatabasesPage } from './pages/databases/DatabasesPage'
import { DatabaseDetailsPage } from './pages/databases/DatabaseDetailsPage'
import { CreateDatabasePage } from './pages/databases/CreateDatabasePage'

import { EmailPage } from './pages/email/EmailPage'
import { EmailDomainDetailsPage } from './pages/email/EmailDomainDetailsPage'
import { CreateEmailDomainPage } from './pages/email/CreateEmailDomainPage'

import { SecurityPage } from './pages/security/SecurityPage'
import { SecurityEventsPage } from './pages/security/SecurityEventsPage'
import { APIKeysPage } from './pages/security/APIKeysPage'
import { SessionsPage } from './pages/security/SessionsPage'

import { SystemPage } from './pages/system/SystemPage'
import { SystemMetricsPage } from './pages/system/SystemMetricsPage'
import { SystemLogsPage } from './pages/system/SystemLogsPage'
import { SystemBackupsPage } from './pages/system/SystemBackupsPage'

import { SettingsPage } from './pages/settings/SettingsPage'
import { ProfilePage } from './pages/settings/ProfilePage'
import { UserSettingsPage } from './pages/settings/UserSettingsPage'
import { SecuritySettingsPage } from './pages/settings/SecuritySettingsPage'

// Applications
import { ApplicationsPage } from './pages/applications/ApplicationsPage'

// Monitoring
import { MonitoringPage } from './pages/monitoring/MonitoringPage'

// Not Found
import { NotFoundPage } from './pages/NotFoundPage'

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-primary">
        <div className="text-center">
          <div className="spinner-lg mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

// Public Route Component (for non-authenticated users)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-primary">
        <div className="text-center">
          <div className="spinner-lg mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />
}

function App() {
  const { checkAuth, loading } = useAuthStore()

  // Check authentication status on app load
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-primary">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="spinner-lg mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-primary-600 rounded-full"></div>
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-text-primary">Fortress Panel</h1>
            <p className="text-text-secondary">High-Security Control Panel</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="App">
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthLayout>
                <LoginPage />
              </AuthLayout>
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <AuthLayout>
                <RegisterPage />
              </AuthLayout>
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <AuthLayout>
                <ForgotPasswordPage />
              </AuthLayout>
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <AuthLayout>
                <ResetPasswordPage />
              </AuthLayout>
            </PublicRoute>
          }
        />
        <Route
          path="/mfa"
          element={
            <PublicRoute>
              <AuthLayout>
                <MFAPage />
              </AuthLayout>
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Default redirect */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          {/* Dashboard */}
          <Route path="dashboard" element={<DashboardPage />} />
          
          {/* Domains */}
          <Route path="domains" element={<DomainsPage />} />
          <Route path="domains/create" element={<CreateDomainPage />} />
          <Route path="domains/:id" element={<DomainDetailsPage />} />
          
          {/* Databases */}
          <Route path="databases" element={<DatabasesPage />} />
          <Route path="databases/create" element={<CreateDatabasePage />} />
          <Route path="databases/:id" element={<DatabaseDetailsPage />} />
          
          {/* Email */}
          <Route path="email" element={<EmailPage />} />
          <Route path="email/create" element={<CreateEmailDomainPage />} />
          <Route path="email/:id" element={<EmailDomainDetailsPage />} />
          
          {/* Applications */}
          <Route path="applications" element={<ApplicationsPage />} />
          
          {/* Monitoring */}
          <Route path="monitoring" element={<MonitoringPage />} />
          
          {/* Security */}
          <Route path="security" element={<SecurityPage />} />
          <Route path="security/events" element={<SecurityEventsPage />} />
          <Route path="security/api-keys" element={<APIKeysPage />} />
          <Route path="security/sessions" element={<SessionsPage />} />
          
          {/* System */}
          <Route path="system" element={<SystemPage />} />
          <Route path="system/metrics" element={<SystemMetricsPage />} />
          <Route path="system/logs" element={<SystemLogsPage />} />
          <Route path="system/backups" element={<SystemBackupsPage />} />
          
          {/* Settings */}
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/profile" element={<ProfilePage />} />
          <Route path="settings/user" element={<UserSettingsPage />} />
          <Route path="settings/security" element={<SecuritySettingsPage />} />
        </Route>

        {/* 404 Page */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

export default App