import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth, RequireRole } from '@/components/auth'
import { ErrorBoundary } from '@/components/errors/ErrorBoundary'
import { InlineSpinner } from '@/components/feedback/async-state'
import { NavigationLoader } from '@/components/feedback/navigation-loader'
import { AdminAnalyticsPage } from '@/features/admin/AdminAnalyticsPage'
import { DirectoryPage } from '@/features/admin/DirectoryPage'
import { SettingsPage } from '@/features/admin/SettingsPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { PendingApprovalPage } from '@/features/auth/PendingApprovalPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ManageCategoriesPage } from '@/features/categories/ManageCategoriesPage'
import { NotFoundPage } from '@/features/errors/NotFoundPage'
import { UnexpectedErrorPage } from '@/features/errors/UnexpectedErrorPage'
import { HomePage } from '@/features/home/HomePage'
import { PublicHomePage } from '@/features/home/PublicHomePage'
import { ListingDetailsPage } from '@/features/listings/ListingDetailsPage'
import { ListingsPage } from '@/features/listings/ListingsPage'
import { MarketDetailsPage } from '@/features/listings/MarketDetailsPage'
import { ManageNotificationsPage } from '@/features/notifications/ManageNotificationsPage'
import { NotificationsInboxPage } from '@/features/notifications/NotificationsInboxPage'
import { ActivityLogsPage } from '@/features/panels/ActivityLogsPage'
import { ErrorLogsPage } from '@/features/panels/ErrorLogsPage'
import { PanelHomePage } from '@/features/panels/PanelHomePage'
import {
  AdminPanelLayout,
  PmPanelLayout,
  ProviderPanelLayout,
  SuperPanelLayout,
} from '@/features/panels/PanelLayouts'
import { PmSettingsPage } from '@/features/pm/PmSettingsPage'
import { ProjectDetailPage } from '@/features/projects/ProjectDetailPage'
import { ProjectsListPage } from '@/features/projects/ProjectsListPage'
import { ProviderProfilePage } from '@/features/provider/ProviderProfilePage'
import { ManageProvidersPage } from '@/features/providers/ManageProvidersPage'
import { ManageReviewsPage } from '@/features/reviews/ManageReviewsPage'
import { UserDetailsPage } from '@/features/users/UserDetailsPage'
import { UserQueuePage } from '@/features/users/UserQueuePage'
import { UsersPage } from '@/features/users/UsersPage'
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
          <Route path="/pending-approval" element={<PendingApprovalPage />} />
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
            <Route index element={<PanelHomePage variant="super" />} />
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
            <Route path="queue" element={<UserQueuePage />} />
            <Route path="approvals" element={<Navigate to="/admin/queue" replace />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="users/:userId" element={<UserDetailsPage />} />
            <Route
              path="verification"
              element={<Navigate to="/admin/queue?view=verification" replace />}
            />
            <Route path="providers" element={<ManageProvidersPage />} />
            <Route path="providers/:providerId" element={<MarketDetailsPage />} />
            <Route path="projects" element={<ProjectsListPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="directory" element={<DirectoryPage />} />
            <Route path="listings" element={<ListingsPage />} />
            <Route path="listings/:id" element={<ListingDetailsPage />} />
            <Route path="reviews" element={<ManageReviewsPage />} />
            <Route path="categories" element={<ManageCategoriesPage />} />
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
            <Route index element={<Navigate to="/pm/projects" replace />} />
            <Route path="analytics" element={<Navigate to="/pm/projects" replace />} />
            <Route path="settings" element={<PmSettingsPage />} />
            <Route path="profile" element={<Navigate to="/pm/settings" replace />} />
            <Route path="projects" element={<ProjectsListPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="directory" element={<DirectoryPage />} />
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
            <Route index element={<Navigate to="/provider/listings" replace />} />
            <Route path="analytics" element={<Navigate to="/provider/listings" replace />} />
            <Route path="listings" element={<ListingsPage />} />
            <Route path="listings/:id" element={<ListingDetailsPage />} />
            <Route path="profile" element={<ProviderProfilePage />} />
            <Route path="notifications" element={<Navigate to="/provider/listings" replace />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
