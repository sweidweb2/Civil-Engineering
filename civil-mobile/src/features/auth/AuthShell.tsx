import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { HardHat } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { softShadows } from '@/theme/shadows'

/**
 * Shared chrome for sign-in / register: branded hero on top, a raised sheet
 * with the form below. Peak-end rule: the first screen sets the tone.
 */
export function AuthShell({
  title,
  subtitle,
  compact = false,
  children,
  testID,
}: {
  title: string
  subtitle?: string
  /** Shorter hero for long forms. */
  compact?: boolean
  children: ReactNode
  testID?: string
}) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  useStatusBarStyle('light')

  return (
    <View className="flex-1 bg-hero" testID={testID}>
      <View
        pointerEvents="none"
        className="absolute -right-24 -top-28 size-80 rounded-full bg-hero-foreground/10"
      />
      <View
        pointerEvents="none"
        className="absolute -left-16 top-40 size-44 rounded-full border-[24px] border-hero-foreground/10"
      />

      <View className="px-6 pb-8" style={{ paddingTop: insets.top + (compact ? 20 : 48) }}>
        <View className="mb-5 size-14 items-center justify-center rounded-2xl border border-hero-foreground/25 bg-hero-foreground/15">
          <HardHat size={28} color="#FFFFFF" />
        </View>
        {compact ? null : (
          <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-hero-foreground/70">
            {t('auth.tagline')}
          </Text>
        )}
        <Text
          className="text-[34px] font-bold leading-10 tracking-tight text-hero-foreground"
          accessibilityRole="header"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-2 text-base leading-6 text-hero-foreground/80">{subtitle}</Text>
        ) : null}
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1 rounded-t-[36px] bg-background" style={softShadows.float}>
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-5 px-6 pt-8"
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}
