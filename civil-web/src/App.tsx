import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth, RequireRole } from '@/components/auth'
import { ErrorBoundary } from '@/components/errors/ErrorBoundary'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { NotFoundPage } from '@/features/errors/NotFoundPage'
import { UnexpectedErrorPage } from '@/features/errors/UnexpectedErrorPage'
import { HomePage } from '@/features/home/HomePage'
import { ActivityLogsPage } from '@/features/panels/ActivityLogsPage'
import { ErrorLogsPage } from '@/features/panels/ErrorLogsPage'
import { PanelHomePage } from '@/features/panels/PanelHomePage'
import {
  AdminPanelLayout,
  ProviderPanelLayout,
  SuperPanelLayout,
} from '@/features/panels/PanelLayouts'
import { homePathForRole } from '@/lib/homePath'
import type { AuthRole } from '@/services/auth'
import { useAuthStore } from '@/stores/authStore'

function hasPanel(role: AuthRole | null | undefined): boolean {
  return role === 'SUPER' || role === 'ADMIN' || role === 'PROVIDER'
}

/** Signed-in `/` — panel roles go to their shell; others stay on client home. */
function RootHome() {
  const role = useAuthStore((s) => s.user?.role)
  if (hasPanel(role)) {
    return <Navigate to={homePathForRole(role)} replace />
  }
  return <HomePage />
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route
            path="/"
            element={
              <RequireAuth>
                <RootHome />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/500" element={<UnexpectedErrorPage />} />

          <Route
            path="/super"
            element={
              <RequireAuth>
                <RequireRole roles={['SUPER']} fallbackTo="/">
                  <SuperPanelLayout />
                </RequireRole>
              </RequireAuth>
            }
          >
            <Route
              index
              element={
                <PanelHomePage
                  title="Super home"
                  description="Platform oversight — activity and error logs."
                />
              }
            />
            <Route path="activity" element={<ActivityLogsPage />} />
            <Route path="errors" element={<ErrorLogsPage />} />
          </Route>

          <Route
            path="/admin"
            element={
              <RequireAuth>
                <RequireRole roles={['ADMIN']} fallbackTo="/">
                  <AdminPanelLayout />
                </RequireRole>
              </RequireAuth>
            }
          >
            <Route
              index
              element={
                <PanelHomePage title="Admin home" description="Admin tools will land here." />
              }
            />
          </Route>

          <Route
            path="/provider"
            element={
              <RequireAuth>
                <RequireRole roles={['PROVIDER']} fallbackTo="/">
                  <ProviderPanelLayout />
                </RequireRole>
              </RequireAuth>
            }
          >
            <Route
              index
              element={
                <PanelHomePage title="Provider home" description="Provider tools will land here." />
              }
            />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
