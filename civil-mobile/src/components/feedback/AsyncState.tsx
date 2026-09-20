import { Text, View } from 'react-native'
import type { ReactNode } from 'react'

import { Alert, AlertIcon, AlertText } from '@/components/ui/alert'
import { Button, ButtonText } from '@/components/ui/button'
import { AlertCircleIcon } from '@/components/ui/icon'
import { Skeleton, SkeletonText } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { errorMessage } from '@/services/feedback'

type AsyncStateProps = {
  isLoading?: boolean
  error?: unknown
  onRetry?: () => void
  loadingFallback?: ReactNode
  children: ReactNode
}

/**
 * Per-screen inline loading / error + retry — not a global app spinner.
 */
export function AsyncState({
  isLoading,
  error,
  onRetry,
  loadingFallback,
  children,
}: AsyncStateProps) {
  if (isLoading) {
    return (
      <>
        {loadingFallback ?? (
          <View className="gap-3 p-4" accessibilityLabel="Loading">
            <SkeletonText _lines={2} className="h-4 w-full" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </View>
        )}
      </>
    )
  }

  if (error) {
    return (
      <View className="gap-3 p-4">
        <Alert variant="destructive">
          <AlertIcon as={AlertCircleIcon} />
          <AlertText>{errorMessage(error, 'Could not load')}</AlertText>
        </Alert>
        {onRetry ? (
          <Button variant="outline" size="sm" onPress={onRetry}>
            <ButtonText>Try again</ButtonText>
          </Button>
        ) : null}
      </View>
    )
  }

  return <>{children}</>
}

export function InlineSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <View className="flex-row items-center gap-2" accessibilityLabel={label}>
      <Spinner size="small" />
      <Text className="text-sm text-muted-foreground">{label}</Text>
    </View>
  )
}
