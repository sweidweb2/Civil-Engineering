import type { LucideIcon } from 'lucide-react-native'
import {
  Activity,
  AlertTriangle,
  ContactRound,
  FileUser,
  FolderKanban,
  FolderTree,
  Home,
  LayoutDashboard,
  LayoutGrid,
  Library,
  MoreHorizontal,
  Package,
  Settings,
  Star,
  Store,
  UserCheck,
  UserRound,
  Users,
} from 'lucide-react-native'

export type PortalId = 'super' | 'admin' | 'pm' | 'provider' | 'client' | 'worker'

export type PortalNavItem = {
  key: string
  label: string
  /** Expo Router href within this portal. */
  href: string
  icon: LucideIcon
  /** Exact path match when true; otherwise prefix match. */
  end?: boolean
}

/**
 * Bottom-tab items per portal.
 * Keep ≤5 tabs — Admin extras live under More.
 * Aligns with civil-web panel nav where practical.
 */
export const SUPER_NAV: PortalNavItem[] = [
  { key: 'home', label: 'Home', href: '/super', icon: Home, end: true },
  { key: 'users', label: 'Users', href: '/super/users', icon: Users },
  { key: 'activity', label: 'Activity', href: '/super/activity', icon: Activity },
  { key: 'errors', label: 'Errors', href: '/super/errors', icon: AlertTriangle },
  { key: 'settings', label: 'Settings', href: '/super/settings', icon: Settings },
]

export const ADMIN_NAV: PortalNavItem[] = [
  { key: 'dashboard', label: 'Home', href: '/admin', icon: LayoutDashboard, end: true },
  { key: 'users', label: 'Users', href: '/admin/users', icon: Users },
  { key: 'projects', label: 'Projects', href: '/admin/projects', icon: FolderKanban },
  { key: 'more', label: 'More', href: '/admin/more', icon: MoreHorizontal },
]

/** Destinations listed on Admin → More (not in the bottom bar). */
export const ADMIN_MORE_LINKS: PortalNavItem[] = [
  { key: 'providers', label: 'Providers', href: '/admin/providers', icon: Store },
  { key: 'queue', label: 'Registration requests', href: '/admin/queue', icon: UserCheck },
  { key: 'directory', label: 'Directory', href: '/admin/directory', icon: Library },
  { key: 'listings', label: 'Listings', href: '/admin/listings', icon: Package },
  { key: 'reviews', label: 'Reviews', href: '/admin/reviews', icon: Star },
  { key: 'categories', label: 'Categories', href: '/admin/categories', icon: FolderTree },
]

export const PM_NAV: PortalNavItem[] = [
  { key: 'dashboard', label: 'Home', href: '/pm', icon: Home, end: true },
  { key: 'projects', label: 'Projects', href: '/pm/projects', icon: FolderKanban },
  { key: 'directory', label: 'Directory', href: '/pm/directory', icon: ContactRound },
  { key: 'account', label: 'Account', href: '/pm/account', icon: UserRound },
]

export const PROVIDER_NAV: PortalNavItem[] = [
  { key: 'dashboard', label: 'Home', href: '/provider', icon: Home, end: true },
  { key: 'listings', label: 'Listings', href: '/provider/listings', icon: LayoutGrid },
  { key: 'profile', label: 'Profile', href: '/provider/profile', icon: Store },
]

export const CLIENT_NAV: PortalNavItem[] = [
  { key: 'home', label: 'Home', href: '/client', icon: Home, end: true },
]

export const WORKER_NAV: PortalNavItem[] = [
  { key: 'home', label: 'Home', href: '/worker', icon: Home, end: true },
  { key: 'cv', label: 'My CV', href: '/worker/cv', icon: FileUser },
  { key: 'account', label: 'Account', href: '/worker/account', icon: UserRound },
]

export function navForPortal(portal: PortalId): PortalNavItem[] {
  switch (portal) {
    case 'super':
      return SUPER_NAV
    case 'admin':
      return ADMIN_NAV
    case 'pm':
      return PM_NAV
    case 'provider':
      return PROVIDER_NAV
    case 'client':
      return CLIENT_NAV
    case 'worker':
      return WORKER_NAV
  }
}

export function isNavItemActive(pathname: string, item: PortalNavItem): boolean {
  if (item.end) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
