import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth, RequireRole } from '@/components/auth'
import { InlineSpinner } from '@/components/feedback/async-state'
import { NavigationLoader } from '@/components/feedback/navigation-loader'
import { ErrorBoundary } from '@/components/errors/ErrorBoundary'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { NotFoundPage } from '@/features/errors/NotFoundPage'
import { UnexpectedErrorPage } from '@/features/errors/UnexpectedErrorPage'
import { HomePage } from '@/features/home/HomePage'
import { PublicHomePage } from '@/features/home/PublicHomePage'
import { ActivityLogsPage } from '@/features/panels/ActivityLogsPage'
import { ErrorLogsPage } from '@/features/panels/ErrorLogsPage'
import { AdminAnalyticsPage } from '@/features/admin/AdminAnalyticsPage'
import { DirectoryPage } from '@/features/admin/DirectoryPage'
import { ListingsPage } from '@/features/admin/ListingsPage'
import { ManageCategoriesPage } from '@/features/admin/ManageCategoriesPage'
import { ManageNotificationsPage } from '@/features/admin/ManageNotificationsPage'
import { ManageProvidersPage } from '@/features/admin/ManageProvidersPage'
import { ManageReviewsPage } from '@/features/admin/ManageReviewsPage'
import { ManageInputTypesPage } from '@/features/admin/ManageInputTypesPage'
import { ManageStepsPage } from '@/features/admin/ManageStepsPage'
import { MarketDetailsPage } from '@/features/admin/MarketDetailsPage'
import { ProjectsListPage } from '@/features/admin/ProjectsListPage'
import { ProjectDetailPage } from '@/features/admin/ProjectDetailPage'
import { SettingsPage } from '@/features/admin/SettingsPage'
import { UserDetailsPage } from '@/features/admin/UserDetailsPage'
import { UserQueuePage } from '@/features/admin/UserQueuePage'
import { UsersPage } from '@/features/admin/UsersPage'
import { NotificationsInboxPage } from '@/features/notifications/NotificationsInboxPage'
import { PmAnalyticsPage } from '@/features/pm/PmAnalyticsPage'
import { PmSettingsPage } from '@/features/pm/PmSettingsPage'
import { PanelHomePage } from '@/features/panels/PanelHomePage'
import {
  AdminPanelLayout,
  PmPanelLayout,
  ProviderPanelLayout,
  SuperPanelLayout,
} from '@/features/panels/PanelLayouts'
import { homePathForRole } from '@/lib/homePath'
import { useAuthStore } from '@/stores/authStore'

/** Public landing. Portal roles stay here and use Dashboard to open their shell. */
function RootRoute() {
  const user = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)

  if (!isHydrated) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <InlineSpinner label="Loading session…" />
      </div>
    )
  }

  if (user && homePathForRole(user.role) === '/') {
    return <HomePage />
  }

  return <PublicHomePage />
}

function App() {
  return (
    <BrowserRouter>
      <NavigationLoader />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<RootRoute />} />
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
            <Route path="steps" element={<ManageStepsPage />} />
            <Route path="input-types" element={<ManageInputTypesPage />} />
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
            <Route path="queue" element={<UserQueuePage />} />
            <Route path="approvals" element={<Navigate to="/admin/queue" replace />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="users/:userId" element={<UserDetailsPage />} />
            <Route path="verification" element={<Navigate to="/admin/queue?view=verification" replace />} />
            <Route path="providers" element={<ManageProvidersPage />} />
            <Route path="providers/:providerId" element={<MarketDetailsPage />} />
            <Route path="projects" element={<ProjectsListPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="directory" element={<DirectoryPage />} />
            <Route path="listings" element={<ListingsPage />} />
            <Route path="reviews" element={<ManageReviewsPage />} />
            <Route path="categories" element={<ManageCategoriesPage />} />
            <Route path="steps" element={<ManageStepsPage />} />
            <Route path="notifications" element={<NotificationsInboxPage />} />
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
            <Route index element={<PmAnalyticsPage />} />
            <Route path="analytics" element={<Navigate to="/pm" replace />} />
            <Route path="settings" element={<PmSettingsPage />} />
            <Route path="profile" element={<Navigate to="/pm/settings" replace />} />
            <Route path="projects" element={<ProjectsListPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="directory" element={<DirectoryPage />} />
            <Route path="steps" element={<Navigate to="/pm/settings?tab=steps" replace />} />
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
