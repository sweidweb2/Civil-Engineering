import { AlertCircle, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/services/api'

import { ContentSkeleton } from './skeletons'

type AsyncStateProps = {
  isLoading?: boolean
  error?: unknown
  onRetry?: () => void
  loadingFallback?: ReactNode
  children: ReactNode
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong'
}

/**
 * Per-feature inline loading / error — not a global app spinner.
 */
export function AsyncState({
  isLoading,
  error,
  onRetry,
  loadingFallback,
  children,
}: AsyncStateProps) {
  if (isLoading) {
    return <>{loadingFallback ?? <ContentSkeleton />}</>
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Could not load</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <span>{errorMessage(error)}</span>
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    )
  }

  return <>{children}</>
}

export function InlineSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="flex items-center gap-2 text-sm text-muted-foreground"
      role="status"
      aria-busy="true"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  )
}
