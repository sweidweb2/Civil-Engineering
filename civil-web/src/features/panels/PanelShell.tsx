import { useEffect, useState } from 'react'
import { cn } from 'cn'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertTriangle,
  ChartColumn,
  FolderKanban,
  FolderTree,
  FormInput,
  Home,
  LayoutDashboard,
  Library,
  ListOrdered,
  LogOut,
  Menu,
  Moon,
  Package,
  Palette,
  Settings,
  Star,
  Store,
  Sun,
  UserCheck,
  UserRound,
  Users,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import type { ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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

type PanelShellVariant = 'sidebar' | 'navbar'

type PanelShellProps = {
  title: string
  nav: PanelNavItem[]
  variant?: PanelShellVariant
  children?: ReactNode
}

function navIsActive(pathname: string, item: PanelNavItem): boolean {
  if (item.end) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

function userDisplayName(user: AuthUser | null): string {
  if (!user) return 'Signed out'
  const parts = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ')
  return user.profile?.displayName || parts || user.email.split('@')[0] || user.email
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

function AccountMenu({
  user,
  onLogout,
}: {
  user: AuthUser | null
  onLogout: () => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const activeTheme = theme === 'colorful' || theme === 'dark' ? theme : 'light'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Avatar size="lg">
          <AvatarFallback>{userInitials(user)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem onClick={() => navigate('/')}>
          <Home />
          Home
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {location.pathname.startsWith('/pm') ? (
          <>
            <DropdownMenuItem onClick={() => navigate('/pm/settings')}>
              <Settings />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        {location.pathname.startsWith('/provider') ? (
          <>
            <DropdownMenuItem onClick={() => navigate('/provider/profile')}>
              <UserRound />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={activeTheme}
            onValueChange={(value) => {
              if (value === 'light' || value === 'colorful' || value === 'dark') {
                setTheme(value)
              }
            }}
          >
            <DropdownMenuRadioItem value="colorful">
              <Palette />
              Colorful
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="light">
              <Sun />
              Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon />
              Dark
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NavLinkClasses(active: boolean) {
  return cn(
    'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors outline-none',
    'hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
    active ? 'bg-muted text-foreground' : 'text-muted-foreground',
  )
}

function PanelNavLinks({
  nav,
  pathname,
  orientation = 'horizontal',
}: {
  nav: PanelNavItem[]
  pathname: string
  orientation?: 'horizontal' | 'vertical'
}) {
  return (
    <nav
      aria-label="Portal"
      className={cn(
        'flex gap-1',
        orientation === 'horizontal'
          ? 'min-w-0 items-center justify-center overflow-x-auto'
          : 'flex-col',
      )}
    >
      {nav.map((item) => {
        const active = navIsActive(pathname, item)
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            aria-current={active ? 'page' : undefined}
            className={NavLinkClasses(active)}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="whitespace-nowrap">{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

function NavbarPanelShell({ title, nav, children }: Omit<PanelShellProps, 'variant'>) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="mx-auto flex h-14 w-full items-center gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
          {/* Left: brand */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Open navigation"
                className="shrink-0 md:hidden"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu />
              </Button>
              <SheetContent side="left" className="w-[min(20rem,85vw)] gap-4 p-4">
                <SheetHeader className="px-1">
                  <SheetTitle>Civil Engineering</SheetTitle>
                  <p className="text-sm text-muted-foreground">{title}</p>
                </SheetHeader>
                <div className="sm:hidden">
                  <PortalPageSearch nav={nav} />
                </div>
                <PanelNavLinks
                  nav={nav}
                  pathname={location.pathname}
                  orientation="vertical"
                />
              </SheetContent>
            </Sheet>

            <div className="flex min-w-0 flex-col">
              <Link
                to="/"
                className="truncate text-sm font-semibold text-foreground"
              >
                Civil Engineering
              </Link>
              <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                {title}
              </span>
            </div>
          </div>

          {/* Center: nav options */}
          <div className="hidden min-w-0 shrink-0 justify-center md:flex">
            <PanelNavLinks nav={nav} pathname={location.pathname} />
          </div>

          {/* Right: search + actions */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <div className="hidden w-40 min-w-0 sm:block md:w-48 lg:w-56">
              <PortalPageSearch nav={nav} />
            </div>
            <NotificationInboxSheet />
            <AccountMenu user={user} onLogout={() => void onLogout()} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {children ?? <Outlet />}
      </main>
    </div>
  )
}

function SidebarPanelShell({ title, nav, children }: Omit<PanelShellProps, 'variant'>) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()

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
              <SidebarMenu className="gap-1 px-1 group-data-[collapsible=icon]:px-0">
                {nav.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      render={<NavLink to={item.to} end={item.end} />}
                      isActive={navIsActive(location.pathname, item)}
                      tooltip={item.label}
                      className="rounded-lg data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:hover:bg-sidebar-accent data-active:hover:text-sidebar-accent-foreground"
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
        <SidebarFooter className="overflow-hidden">
          <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <Avatar>
              <AvatarFallback>{userInitials(user)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {userDisplayName(user)}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/70">{user?.email}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Sign out"
              className="shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden"
              onClick={() => void onLogout()}
            >
              <LogOut />
            </Button>
          </div>
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
            <AccountMenu user={user} onLogout={() => void onLogout()} />
          </div>
        </header>
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          {children ?? <Outlet />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function PanelShell({ title, nav, variant = 'sidebar', children }: PanelShellProps) {
  if (variant === 'navbar') {
    return <NavbarPanelShell title={title} nav={nav}>{children}</NavbarPanelShell>
  }
  return <SidebarPanelShell title={title} nav={nav}>{children}</SidebarPanelShell>
}

export const SUPER_NAV: PanelNavItem[] = [
  { to: '/super', label: 'Home', icon: Home, end: true },
  { to: '/super/users', label: 'Users', icon: Users },
  { to: '/super/activity', label: 'Activity', icon: Activity },
  { to: '/super/errors', label: 'Errors', icon: AlertTriangle },
  { to: '/super/steps', label: 'Steps', icon: ListOrdered },
  { to: '/super/input-types', label: 'Input types', icon: FormInput },
  { to: '/super/settings', label: 'Settings', icon: Settings },
]

export const ADMIN_NAV: PanelNavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/queue', label: 'Queue', icon: UserCheck },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/providers', label: 'Providers', icon: Store },
  { to: '/admin/projects', label: 'Projects', icon: FolderKanban },
  { to: '/admin/directory', label: 'Directory', icon: Library },
  { to: '/admin/listings', label: 'Listings', icon: Package },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/steps', label: 'Steps', icon: ListOrdered },
]

export const PM_NAV: PanelNavItem[] = [
  { to: '/pm', label: 'Analytics', icon: ChartColumn, end: true },
  { to: '/pm/projects', label: 'Manage projects', icon: FolderKanban },
  { to: '/pm/directory', label: 'Directory', icon: Library },
]

export const PROVIDER_NAV: PanelNavItem[] = [
  { to: '/provider', label: 'Home', icon: Home, end: true },
  { to: '/provider/listings', label: 'Listings', icon: Package },
  { to: '/provider/analytics', label: 'Analytics', icon: ChartColumn },
]
