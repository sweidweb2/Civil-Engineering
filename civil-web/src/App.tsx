import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth, RequireRole } from '@/components/auth'
import { ErrorBoundary } from '@/components/errors/ErrorBoundary'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ErrorsPage } from '@/features/errors/ErrorsPage'
import { NotFoundPage } from '@/features/errors/NotFoundPage'
import { UnexpectedErrorPage } from '@/features/errors/UnexpectedErrorPage'
import { HomePage } from '@/features/home/HomePage'
import { ActivityLogsPage } from '@/features/panels/ActivityLogsPage'
import { ErrorLogsPage } from '@/features/panels/ErrorLogsPage'
import { AdminAnalyticsPage } from '@/features/admin/AdminAnalyticsPage'
import { DirectoryPage } from '@/features/admin/DirectoryPage'
import { ManageCategoriesPage } from '@/features/admin/ManageCategoriesPage'
import { ManageNotificationsPage } from '@/features/admin/ManageNotificationsPage'
import { ManageProvidersPage } from '@/features/admin/ManageProvidersPage'
import { ManageReviewsPage } from '@/features/admin/ManageReviewsPage'
import { MarketDetailsPage } from '@/features/admin/MarketDetailsPage'
import { ProjectsListPage } from '@/features/admin/ProjectsListPage'
import { ProjectDetailPage } from '@/features/admin/ProjectDetailPage'
import { RegistrationApprovalsPage } from '@/features/admin/RegistrationApprovalsPage'
import { SettingsPage } from '@/features/admin/SettingsPage'
import { UserDetailsPage } from '@/features/admin/UserDetailsPage'
import { UsersPage } from '@/features/admin/UsersPage'
import { WorkerVerificationPage } from '@/features/admin/WorkerVerificationPage'
import { NotificationsInboxPage } from '@/features/notifications/NotificationsInboxPage'
import { PanelHomePage } from '@/features/panels/PanelHomePage'
import {
  AdminPanelLayout,
  PmPanelLayout,
  ProviderPanelLayout,
  SuperPanelLayout,
} from '@/features/panels/PanelLayouts'
import { homePathForRole } from '@/lib/homePath'
import type { AuthRole } from '@/services/auth'
import { useAuthStore } from '@/stores/authStore'

function hasPanel(role: AuthRole | null | undefined): boolean {
  return role === 'SUPER' || role === 'ADMIN' || role === 'MANAGER' || role === 'PROVIDER'
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
                  description="Platform oversight — users, activity, errors, and settings."
                />
              }
            />
            <Route path="users" element={<UsersPage />} />
            <Route path="users/:userId" element={<UserDetailsPage />} />
            <Route path="activity" element={<ActivityLogsPage />} />
            <Route path="errors" element={<ErrorLogsPage />} />
            <Route path="notifications" element={<ManageNotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
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
            <Route index element={<AdminAnalyticsPage />} />
            <Route path="approvals" element={<RegistrationApprovalsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="users/:userId" element={<UserDetailsPage />} />
            <Route path="verification" element={<WorkerVerificationPage />} />
            <Route path="providers" element={<ManageProvidersPage />} />
            <Route path="providers/:providerId" element={<MarketDetailsPage />} />
            <Route path="projects" element={<ProjectsListPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="directory" element={<DirectoryPage />} />
            <Route path="reviews" element={<ManageReviewsPage />} />
            <Route path="categories" element={<ManageCategoriesPage />} />
            <Route path="notifications" element={<NotificationsInboxPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route
            path="/pm"
            element={
              <RequireAuth>
                <RequireRole roles={['MANAGER']} fallbackTo="/">
                  <PmPanelLayout />
                </RequireRole>
              </RequireAuth>
            }
          >
            <Route
              index
              element={
                <PanelHomePage title="PM home" description="Project manager tools will land here." />
              }
            />
            <Route path="notifications" element={<NotificationsInboxPage />} />
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
            <Route path="notifications" element={<NotificationsInboxPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
