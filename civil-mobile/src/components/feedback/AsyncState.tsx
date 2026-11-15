import { Text, View } from 'react-native'
import type { ReactNode } from 'react'

import { IsometricLoader } from '@/components/feedback/IsometricLoader'
import { Alert, AlertIcon, AlertText } from '@/components/ui/alert'
import { Button, ButtonText } from '@/components/ui/button'
import { AlertCircleIcon } from '@/components/ui/icon'
import { Spinner } from '@/components/ui/spinner'
import { errorMessage } from '@/services/feedback'

type AsyncStateProps = {
  isLoading?: boolean
  error?: unknown
  onRetry?: () => void
  /** Defaults to the shared isometric portal loader. */
  loadingFallback?: ReactNode
  /** Label passed to the default isometric loader. */
  loadingLabel?: string
  children: ReactNode
}

/**
 * Per-screen loading / error + retry.
 * Default loading UI is IsometricLoader (all portal pages).
 */
export function AsyncState({
  isLoading,
  error,
  onRetry,
  loadingFallback,
  loadingLabel = 'Loading…',
  children,
}: AsyncStateProps) {
  if (isLoading) {
    return <>{loadingFallback ?? <IsometricLoader label={loadingLabel} />}</>
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
