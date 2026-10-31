import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
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
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { LanguageToggle, setAppLocale } from '@/components/i18n/LanguageToggle'
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
import { type AppLocale, useIsRtl, useLocaleStore } from '@/stores/localeStore'

import { PortalPageSearch } from './PortalPageSearch'

export type PanelNavItem = {
  to: string
  /** Key under the `nav` namespace (without prefix). */
  labelKey: string
  icon: LucideIcon
  end?: boolean
}

type PanelShellVariant = 'sidebar' | 'navbar'

type PanelShellProps = {
  titleKey: string
  nav: PanelNavItem[]
  variant?: PanelShellVariant
  children?: ReactNode
}

function navIsActive(pathname: string, item: PanelNavItem): boolean {
  if (item.end) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

function userDisplayName(user: AuthUser | null, signedOutLabel: string): string {
  if (!user) return signedOutLabel
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

function AccountMenu({ user, onLogout }: { user: AuthUser | null; onLogout: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation(['account', 'common', 'nav'])
  const locale = useLocaleStore((state) => state.locale)
  const activeTheme = theme === 'colorful' || theme === 'dark' ? theme : 'light'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('common:accountMenu')}
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Avatar size="lg">
          <AvatarFallback>{userInitials(user)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem onClick={() => navigate('/')}>
          <Home />
          {t('common:home')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {location.pathname.startsWith('/pm') ? (
          <>
            <DropdownMenuItem onClick={() => navigate('/pm/settings')}>
              <Settings />
              {t('account:settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        {location.pathname.startsWith('/provider') ? (
          <>
            <DropdownMenuItem onClick={() => navigate('/provider/profile')}>
              <UserRound />
              {t('account:profile')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('account:language')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={locale}
            onValueChange={(value) => {
              if (value === 'en' || value === 'ar') setAppLocale(value as AppLocale)
            }}
          >
            <DropdownMenuRadioItem value="en">{t('account:languageEn')}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="ar">{t('account:languageAr')}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('account:theme')}</DropdownMenuLabel>
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
              {t('account:themeColorful')}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="light">
              <Sun />
              {t('account:themeLight')}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon />
              {t('account:themeDark')}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}>
          <LogOut />
          {t('common:signOut')}
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
  const { t } = useTranslation(['nav', 'common'])

  return (
    <nav
      aria-label={t('common:navigation')}
      className={cn(
        'flex gap-1',
        orientation === 'horizontal'
          ? 'min-w-0 items-center justify-center overflow-x-auto'
          : 'flex-col',
      )}
    >
      {nav.map((item) => {
        const active = navIsActive(pathname, item)
        const label = t(item.labelKey)
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            aria-current={active ? 'page' : undefined}
            className={NavLinkClasses(active)}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="whitespace-nowrap">{label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

function HeaderActions({
  nav,
  user,
  onLogout,
  showSearch = true,
}: {
  nav: PanelNavItem[]
  user: AuthUser | null
  onLogout: () => void
  showSearch?: boolean
}) {
  return (
    <div className="flex min-w-0 items-center justify-end gap-2">
      {showSearch ? (
        <div className="hidden w-40 min-w-0 sm:block md:w-48 lg:w-56">
          <PortalPageSearch nav={nav} />
        </div>
      ) : null}
      <LanguageToggle />
      <NotificationInboxSheet />
      <AccountMenu user={user} onLogout={onLogout} />
    </div>
  )
}

function NavbarPanelShell({ titleKey, nav, children }: Omit<PanelShellProps, 'variant'>) {
  const { t } = useTranslation(['nav', 'common'])
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const isRtl = useIsRtl()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const title = t(titleKey)

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
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('common:openNavigation')}
                className="shrink-0 md:hidden"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu />
              </Button>
              <SheetContent
                side={isRtl ? 'right' : 'left'}
                className="w-[min(20rem,85vw)] gap-4 p-4"
              >
                <SheetHeader className="px-1">
                  <SheetTitle>{t('common:appName')}</SheetTitle>
                  <p className="text-sm text-muted-foreground">{title}</p>
                </SheetHeader>
                <div className="sm:hidden">
                  <PortalPageSearch nav={nav} />
                </div>
                <PanelNavLinks nav={nav} pathname={location.pathname} orientation="vertical" />
              </SheetContent>
            </Sheet>

            <div className="flex min-w-0 flex-col">
              <Link to="/" className="truncate text-sm font-semibold text-foreground">
                {t('common:appName')}
              </Link>
              <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                {title}
              </span>
            </div>
          </div>

          <div className="hidden min-w-0 shrink-0 justify-center md:flex">
            <PanelNavLinks nav={nav} pathname={location.pathname} />
          </div>

          <div className="flex min-w-0 flex-1 justify-end">
            <HeaderActions nav={nav} user={user} onLogout={() => void onLogout()} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {children ?? <Outlet />}
      </main>
    </div>
  )
}

function SidebarPanelShell({ titleKey, nav, children }: Omit<PanelShellProps, 'variant'>) {
  const { t } = useTranslation(['nav', 'common'])
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const isRtl = useIsRtl()
  const title = t(titleKey)

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <SidebarProvider className="h-svh max-h-svh overflow-hidden">
      <Sidebar collapsible="icon" side={isRtl ? 'right' : 'left'}>
        <SidebarHeader className="overflow-hidden">
          <div className="flex items-center px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <Link
              to="/"
              className="truncate text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden"
            >
              {t('common:appName')}
            </Link>
            <Link
              to="/"
              aria-label={t('common:appName')}
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
            <SidebarGroupLabel>{t('common:navigation')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1 px-1 group-data-[collapsible=icon]:px-0">
                {nav.map((item) => {
                  const label = t(item.labelKey)
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        render={<NavLink to={item.to} end={item.end} />}
                        isActive={navIsActive(location.pathname, item)}
                        tooltip={label}
                        className="rounded-lg data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:hover:bg-sidebar-accent data-active:hover:text-sidebar-accent-foreground"
                      >
                        <item.icon />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
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
                {userDisplayName(user, t('common:signedOut'))}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/70">{user?.email}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('common:signOut')}
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
          <HeaderActions
            nav={nav}
            user={user}
            onLogout={() => void onLogout()}
            showSearch={false}
          />
        </header>
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          {children ?? <Outlet />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function PanelShell({ titleKey, nav, variant = 'sidebar', children }: PanelShellProps) {
  if (variant === 'navbar') {
    return (
      <NavbarPanelShell titleKey={titleKey} nav={nav}>
        {children}
      </NavbarPanelShell>
    )
  }
  return (
    <SidebarPanelShell titleKey={titleKey} nav={nav}>
      {children}
    </SidebarPanelShell>
  )
}

export const SUPER_NAV: PanelNavItem[] = [
  { to: '/super', labelKey: 'home', icon: Home, end: true },
  { to: '/super/users', labelKey: 'users', icon: Users },
  { to: '/super/activity', labelKey: 'activity', icon: Activity },
  { to: '/super/errors', labelKey: 'errors', icon: AlertTriangle },
  { to: '/super/steps', labelKey: 'steps', icon: ListOrdered },
  { to: '/super/input-types', labelKey: 'inputTypes', icon: FormInput },
  { to: '/super/settings', labelKey: 'settings', icon: Settings },
]

export const ADMIN_NAV: PanelNavItem[] = [
  { to: '/admin', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/queue', labelKey: 'queue', icon: UserCheck },
  { to: '/admin/users', labelKey: 'users', icon: Users },
  { to: '/admin/providers', labelKey: 'providers', icon: Store },
  { to: '/admin/projects', labelKey: 'projects', icon: FolderKanban },
  { to: '/admin/directory', labelKey: 'directory', icon: Library },
  { to: '/admin/listings', labelKey: 'listings', icon: Package },
  { to: '/admin/reviews', labelKey: 'reviews', icon: Star },
  { to: '/admin/categories', labelKey: 'categories', icon: FolderTree },
  { to: '/admin/steps', labelKey: 'steps', icon: ListOrdered },
]

export const PM_NAV: PanelNavItem[] = [
  { to: '/pm', labelKey: 'analytics', icon: ChartColumn, end: true },
  { to: '/pm/projects', labelKey: 'manageProjects', icon: FolderKanban },
  { to: '/pm/directory', labelKey: 'directory', icon: Library },
]

export const PROVIDER_NAV: PanelNavItem[] = [
  { to: '/provider', labelKey: 'home', icon: Home, end: true },
  { to: '/provider/listings', labelKey: 'listings', icon: Package },
  { to: '/provider/analytics', labelKey: 'analytics', icon: ChartColumn },
]
