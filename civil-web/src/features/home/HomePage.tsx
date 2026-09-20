import { HardHat } from 'lucide-react'
import { Navigate } from 'react-router-dom'

import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'

export function HomePage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const isHydrated = useAuthStore((s) => s.isHydrated)

  if (!isHydrated) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const name =
    user.profile?.displayName ||
    [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') ||
    user.email

  return (
    <div className="min-h-svh bg-background">
      <Header>
        <div className="flex w-full items-center justify-between gap-3">
          <h1 className="text-base font-semibold text-foreground">Home</h1>
          <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
            Log out
          </Button>
        </div>
      </Header>

      <main className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-muted/40">
          <HardHat className="size-8 text-foreground" aria-hidden />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Welcome, {name}</h2>
        <p className="text-muted-foreground">
          You are signed in as <span className="font-medium text-foreground">{user.role}</span>.
          This is your home base for Civil Engineering.
        </p>
      </main>
    </div>
  )
}
