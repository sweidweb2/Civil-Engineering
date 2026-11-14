import { ArrowRight, LayoutDashboard, LogIn } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button, buttonVariants } from '@/components/ui/button'
import { homePathForRole } from '@/lib/homePath'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

export function SectionHeading({ id, title, text }: { id: string; title: string; text: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2
        id={id}
        className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
      >
        {title}
      </h2>
      <p className="mt-4 text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
        {text}
      </p>
    </div>
  )
}

export function PublicHomeAction({
  className,
  showArrow = false,
}: {
  className?: string
  showArrow?: boolean
}) {
  const user = useAuthStore((s) => s.user)
  const portalPath = user ? homePathForRole(user.role) : null
  const isSignedIn = Boolean(user && portalPath && portalPath !== '/')

  if (isSignedIn && portalPath) {
    return (
      <Link to={portalPath} className={cn(buttonVariants(), className)}>
        {showArrow ? null : <LayoutDashboard />}
        Dashboard
        {showArrow ? <ArrowRight /> : null}
      </Link>
    )
  }

  if (user) return null

  return (
    <Link to="/login" className={cn(buttonVariants(), className)}>
      {showArrow ? null : <LogIn />}
      Sign in
      {showArrow ? <ArrowRight /> : null}
    </Link>
  )
}

function AppleStoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7 text-primary" aria-hidden>
      <path
        fill="currentColor"
        d="M16.37 12.72c-.03-2.35 1.92-3.48 2.01-3.53-1.1-1.61-2.81-1.83-3.41-1.85-1.45-.15-2.84.86-3.58.86-.74 0-1.88-.84-3.09-.82-1.59.03-3.06.93-3.88 2.36-1.66 2.88-.42 7.14 1.19 9.48.79 1.14 1.73 2.42 2.96 2.37 1.19-.05 1.64-.77 3.08-.77 1.43 0 1.84.77 3.09.74 1.28-.02 2.09-1.16 2.87-2.31.9-1.32 1.27-2.6 1.29-2.67-.03-.01-2.48-.95-2.51-3.86zM14.58 6.39c.65-.79 1.09-1.89.97-2.99-1 .04-2.21.67-2.93 1.46-.64.74-1.2 1.86-1.05 2.95 1.11.09 2.25-.57 3.01-1.42z"
      />
    </svg>
  )
}

function PlayStoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7 text-primary" aria-hidden>
      <path
        fill="currentColor"
        d="M4.4 3.55v16.9c0 .86.94 1.39 1.68.94l13.55-8.45c.7-.44.7-1.44 0-1.88L6.08 2.61c-.74-.45-1.68.08-1.68.94z"
      />
    </svg>
  )
}

export function StoreDownloadButton({ store }: { store: 'apple' | 'play' }) {
  const isApple = store === 'apple'
  const storeName = isApple ? 'App Store' : 'Play Store'

  return (
    <span title="Not available yet" className="inline-flex">
      <Button
        type="button"
        variant="outline"
        disabled
        aria-label={`Download the app from the ${storeName}. Not available yet.`}
        className="h-auto cursor-not-allowed gap-3 rounded-xl bg-card px-4 py-2.5 text-left shadow-sm disabled:opacity-70"
      >
        {isApple ? <AppleStoreIcon /> : <PlayStoreIcon />}
        <span className="flex flex-col leading-none">
          <span className="text-xs font-medium tracking-wide text-muted-foreground">
            Download from
          </span>
          <span className="mt-1 text-base font-semibold text-foreground">{storeName}</span>
        </span>
      </Button>
    </span>
  )
}
