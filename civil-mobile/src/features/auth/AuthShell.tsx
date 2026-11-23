import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import type { ReactNode } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { useAuthTranslation } from '@/features/auth/useAuthTranslation'

import { AuthBody, AuthHero } from './ui'

/**
 * Auth chrome: the deep-green illustration band on top (brand + self-drawing
 * structure, no copy), the form laid flat on the page underneath it.
 * Always LTR; status bar is light over the hero.
 */
export function AuthShell({ children, testID }: { children: ReactNode; testID?: string }) {
  const { t } = useAuthTranslation()
  const insets = useSafeAreaInsets()
  useStatusBarStyle('light')

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-wk-sf"
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
        <AuthHero brand={t('auth.brand')} />
        <AuthBody>{children}</AuthBody>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
