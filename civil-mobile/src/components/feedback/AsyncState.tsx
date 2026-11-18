import { Text, View } from 'react-native'
import { AlertCircle } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { PageSkeleton } from '@/components/feedback/PageSkeleton'
import { Button, ButtonText } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useThemeColors } from '@/hooks/useThemeColors'
import { errorMessage } from '@/services/feedback'
import { sizes } from '@/theme/sizes'
import { TYPE } from '@/theme/typography'

type AsyncStateProps = {
  isLoading?: boolean
  error?: unknown
  onRetry?: () => void
  /** Defaults to a page skeleton (hero + grouped list). */
  loadingFallback?: ReactNode
  /** Accessible label for the loading state. */
  loadingLabel?: string
  children: ReactNode
}

/**
 * Per-screen loading / error + retry (section 8).
 * Loading: skeletons in the page's shape. Error: inline where the content
 * would be — negative icon, plain-language cause, "Try again" text button.
 */
export function AsyncState({
  isLoading,
  error,
  onRetry,
  loadingFallback,
  loadingLabel,
  children,
}: AsyncStateProps) {
  const { t } = useTranslation()
  if (isLoading) {
    return <>{loadingFallback ?? <PageSkeleton label={loadingLabel ?? t('common.loading')} />}</>
  }

  if (error) {
    return <InlineError error={error} onRetry={onRetry} />
  }

  return <>{children}</>
}

/** Inline error block: icon, cause, detail, "Try again". */
export function InlineError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  return (
    <View className="items-start gap-2 px-5 py-6" accessibilityRole="alert">
      <AlertCircle size={sizes.icon} color={colors.negative} strokeWidth={sizes.iconStroke} />
      <Text className={`${TYPE.bodyStrong} text-foreground`}>{t('common.couldNotLoad')}</Text>
      <Text className={`${TYPE.bodySm} text-muted-foreground`}>
        {errorMessage(error, t('common.errorGeneric'))}
      </Text>
      {onRetry ? (
        <Button variant="ghost" className="-ms-3 mt-1 min-h-11 px-3" onPress={onRetry}>
          <ButtonText>{t('common.tryAgain')}</ButtonText>
        </Button>
      ) : null}
    </View>
  )
}

export function InlineSpinner({ label }: { label?: string }) {
  const { t } = useTranslation()
  return (
    <View className="flex-row items-center gap-2" accessibilityLabel={label ?? t('common.loading')}>
      <Spinner size="small" />
      <Text className={`${TYPE.bodySm} text-muted-foreground`}>{label ?? t('common.loading')}</Text>
    </View>
  )
}
