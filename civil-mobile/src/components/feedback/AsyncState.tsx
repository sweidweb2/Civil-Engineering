import { Text, View } from 'react-native'
import type { ReactNode } from 'react'

import { IsometricLoader } from '@/components/feedback/IsometricLoader'
import { Button, ButtonText } from '@/components/ui/button'
import { AlertCircleIcon, Icon } from '@/components/ui/icon'
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
      <View className="flex-1 items-center justify-center gap-3 px-8 py-12">
        <View className="size-16 items-center justify-center rounded-full bg-destructive/10">
          <Icon as={AlertCircleIcon} className="size-7 text-destructive" />
        </View>
        <Text className="text-center text-lg font-bold text-foreground">Could not load</Text>
        <Text className="text-center text-sm leading-5 text-muted-foreground">
          {errorMessage(error, 'Something went wrong. Check your connection and try again.')}
        </Text>
        {onRetry ? (
          <Button variant="outline" size="sm" className="mt-2" onPress={onRetry}>
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
