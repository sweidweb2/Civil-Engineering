import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Eyebrow, useStatusBarStyle } from '@/components/kit'
import { useIsDark } from '@/hooks/useThemeColors'
import { spacing } from '@/theme/spacing'
import { TYPE } from '@/theme/typography'

/**
 * Onboarding / auth chrome (archetype G): mono eyebrow, large left-aligned
 * headline in the top third, one muted line, the fields, and the primary
 * action pinned at the bottom. No hero art, no carousel.
 */
export function AuthShell({
  title,
  subtitle,
  compact = false,
  children,
  footer,
  testID,
}: {
  title: string
  subtitle?: string
  /** Less top space for long forms. */
  compact?: boolean
  children: ReactNode
  /** Pinned bottom actions (primary + text button). */
  footer?: ReactNode
  testID?: string
}) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const isDark = useIsDark()
  useStatusBarStyle(isDark ? 'light' : 'dark')

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID={testID}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-7 px-5"
        contentContainerStyle={{
          paddingTop: insets.top + (compact ? spacing.section : spacing['2xl'] + spacing.lg),
          paddingBottom: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-3">
          <Eyebrow>{t('auth.tagline')}</Eyebrow>
          <Text className={`${TYPE.headline} text-foreground`} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text className={`${TYPE.body} text-muted-foreground`}>{subtitle}</Text>
          ) : null}
        </View>
        <View className="gap-4">{children}</View>
      </ScrollView>
      {footer ? (
        <View
          className="gap-1.5 bg-background px-5 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom + 8, 20) }}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  )
}
