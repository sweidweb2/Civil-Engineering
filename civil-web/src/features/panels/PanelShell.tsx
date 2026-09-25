import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Bell,
  FolderKanban,
  FolderTree,
  Home,
  LayoutDashboard,
  Library,
  LogOut,
  Moon,
  Settings,
  Star,
  Sun,
  Store,
  UserCheck,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useTheme } from 'next-themes'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { NotificationInboxSheet } from '@/features/notifications/NotificationInboxSheet'
import type { AuthUser } from '@/services/auth'
import { useAuthStore } from '@/stores/authStore'

import { PortalPageSearch } from './PortalPageSearch'

export type PanelNavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

type PanelShellProps = {
  title: string
  nav: PanelNavItem[]
  children?: ReactNode
}

function navIsActive(pathname: string, item: PanelNavItem): boolean {
  if (item.end) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

function userInitials(user: AuthUser | null): string {
  if (!user) return '?'
  const fromName = [user.profile?.firstName, user.profile?.lastName]
    .filter((part): part is string => Boolean(part))
    .map((part) => part[0])
    .join('')
  if (fromName) return fromName.slice(0, 2).toUpperCase()
  if (user.profile?.displayName) return user.profile.displayName.slice(0, 2).toUpperCase()
  return user.email.slice(0, 2).toUpperCase()
}

export function PanelShell({ title, nav, children }: PanelShellProps) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <SidebarProvider className="h-svh max-h-svh overflow-hidden">
      <Sidebar collapsible="icon">
        <SidebarHeader className="overflow-hidden">
          <div className="flex items-center px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <Link
              to="/"
              className="truncate text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden"
            >
              Civil Engineering
            </Link>
            <Link
              to="/"
              aria-label="Civil Engineering"
              className="hidden size-8 items-center justify-center text-xs font-semibold text-sidebar-foreground group-data-[collapsible=icon]:flex"
            >
              CE
            </Link>
          </div>
          <p className="truncate px-2 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
            {title}
          </p>
        </SidebarHeader>
        <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1 px-1">
                {nav.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      render={<NavLink to={item.to} end={item.end} />}
                      isActive={navIsActive(location.pathname, item)}
                      tooltip={item.label}
                      className="rounded-lg data-active:bg-card data-active:text-primary data-active:hover:bg-card data-active:hover:text-primary"
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="overflow-hidden group-data-[collapsible=icon]:hidden">
          <p className="truncate px-2 pb-2 text-xs text-sidebar-foreground/70">{user?.email}</p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
        <header className="grid h-16 shrink-0 grid-cols-[auto_minmax(0,20rem)_auto] items-center gap-3 border-b border-border bg-card px-6 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,24rem)_minmax(0,1fr)]">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger />
            <span className="hidden truncate text-sm font-medium text-foreground sm:inline">
              {title}
            </span>
          </div>
          <PortalPageSearch nav={nav} />
          <div className="flex items-center justify-end gap-2">
            <NotificationInboxSheet />
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Account menu"
                className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Avatar size="lg">
                  <AvatarFallback>{userInitials(user)}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuItem
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                >
                  {isDark ? <Sun /> : <Moon />}
                  {isDark ? 'Light theme' : 'Dark theme'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void onLogout()}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          {children ?? <Outlet />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export const SUPER_NAV: PanelNavItem[] = [
  { to: '/super', label: 'Home', icon: Home, end: true },
  { to: '/super/users', label: 'Users', icon: Users },
  { to: '/super/activity', label: 'Activity', icon: Activity },
  { to: '/super/errors', label: 'Errors', icon: AlertTriangle },
  { to: '/super/notifications', label: 'Notifications', icon: Bell },
  { to: '/super/settings', label: 'Settings', icon: Settings },
]

export const ADMIN_NAV: PanelNavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/approvals', label: 'Approvals', icon: UserCheck },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/verification', label: 'Verification', icon: BadgeCheck },
  { to: '/admin/providers', label: 'Providers', icon: Store },
  { to: '/admin/projects', label: 'Projects', icon: FolderKanban },
  { to: '/admin/directory', label: 'Directory', icon: Library },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export const PM_NAV: PanelNavItem[] = [
  { to: '/pm', label: 'Home', icon: Home, end: true },
  { to: '/pm/notifications', label: 'Notifications', icon: Bell },
]

export const PROVIDER_NAV: PanelNavItem[] = [
  { to: '/provider', label: 'Home', icon: Home, end: true },
  { to: '/provider/notifications', label: 'Notifications', icon: Bell },
]
