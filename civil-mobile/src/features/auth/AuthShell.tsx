import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import type { ReactNode } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { useAuthTranslation } from '@/features/auth/useAuthTranslation'

import { AuthCard, AuthHero } from './ui'

/**
 * Auth chrome: deep-green hero (blueprint grid + self-drawing structure) with
 * the title, and a white card rising over its edge that holds the form.
 * Always LTR; status bar is light over the hero.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  below,
  testID,
}: {
  title: string
  subtitle?: string
  /** Card contents. */
  children: ReactNode
  /** Optional content under the card (links, notes). */
  below?: ReactNode
  testID?: string
}) {
  const { t } = useAuthTranslation()
  const insets = useSafeAreaInsets()
  useStatusBarStyle('light')

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-wk-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ direction: 'ltr' }}
      testID={testID}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
      >
        <AuthHero brand={t('auth.brand')} title={title} subtitle={subtitle} />
        <AuthCard>{children}</AuthCard>
        {below ? <View className="px-6 pt-5">{below}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
