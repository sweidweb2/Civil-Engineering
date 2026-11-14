import { useState } from 'react'
import { Loader2, LogOut, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AuthUser } from '@/services/auth'
import { useAuthStore } from '@/stores/authStore'

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

function providerHeaderTitle(pathname: string, t: (key: string) => string): string | null {
  if (pathname.startsWith('/provider/profile')) return t('account:profile')
  if (pathname.startsWith('/provider/listings')) return t('nav:listings')
  return null
}

/** Minimal provider chrome — logo + page title top bar, no sidebar. */
export function ProviderShell() {
  const { t } = useTranslation(['common', 'account', 'nav'])
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const title = providerHeaderTitle(location.pathname, t)

  async function onLogout() {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="flex h-svh max-h-svh flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 md:px-6">
        <Link
          to="/provider/listings"
          aria-label={t('common:appName')}
          className="inline-flex shrink-0 items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {/* Brand logo TBD — placeholder mark until the asset is ready. */}
          <span
            aria-hidden
            className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-muted text-xs font-semibold tracking-tight text-foreground"
          >
            CE
          </span>
        </Link>

        {title ? (
          <h1 className="min-w-0 truncate text-sm font-medium text-foreground">{title}</h1>
        ) : null}

        <div className="ms-auto shrink-0">
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
              <DropdownMenuItem onClick={() => navigate('/provider/profile')}>
                <UserRound />
                {t('account:profile')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => void onLogout()}
                disabled={isLoggingOut}
                aria-busy={isLoggingOut}
              >
                {isLoggingOut ? <Loader2 className="animate-spin" aria-hidden /> : <LogOut />}
                {isLoggingOut ? t('common:signingOut') : t('common:signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}
