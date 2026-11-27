import { type ReactNode, useCallback } from 'react'
import { Text, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { setStatusBarStyle } from 'expo-status-bar'
import { ChevronLeft, type LucideIcon } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Pressable } from '@/components/ui/pressable'
import { useIsDark, useThemeColors } from '@/hooks/useThemeColors'
import { sizes } from '@/theme/sizes'
import { spacing } from '@/theme/spacing'
import { TYPE } from '@/theme/typography'

import { DirectionalIcon } from './primitives'

/** Sets the status-bar icon color while this screen is focused. */
export function useStatusBarStyle(style: 'light' | 'dark') {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(style)
    }, [style]),
  )
}

function goBack(fallbackHref: string) {
  if (router.canGoBack()) router.back()
  else router.replace(fallbackHref as never)
}

/** Human date for header captions: "Wednesday, 18 November". */
export function useTodayCaption(): string {
  const { i18n } = useTranslation()
  return new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** 44px circular icon button: surface + 1px line, 20px line icon. */
export function IconButton({
  icon: Icon,
  label,
  onPress,
  disabled = false,
  dot = false,
}: {
  icon: LucideIcon
  label: string
  onPress: () => void
  disabled?: boolean
  /** Accent notification dot, top-end. */
  dot?: boolean
}) {
  const colors = useThemeColors()
  const mirrored = Icon === ChevronLeft
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      className={`items-center justify-center rounded-full border border-border bg-card active:bg-background ${
        disabled ? 'opacity-40' : ''
      }`}
      style={{ width: sizes.iconButton, height: sizes.iconButton }}
      onPress={onPress}
    >
      {mirrored ? (
        <DirectionalIcon icon={Icon} size={sizes.icon} color={colors.ink} />
      ) : (
        <Icon size={sizes.icon} color={colors.ink} strokeWidth={sizes.iconStroke} />
      )}
      {dot ? (
        <View
          className="absolute end-2.5 top-2.5 rounded-full border-[1.5px] border-card bg-primary"
          style={{ width: sizes.dot + 3, height: sizes.dot + 3 }}
        />
      ) : null}
    </Pressable>
  )
}

type ScreenHeaderProps = {
  /** Page title (type.title). */
  title: string
  /** Small context line above the title (date, role…). */
  caption?: string
  /** When set, shows a back button (for screens reached by push). */
  backHref?: string
  /** Up to two icon buttons / avatar. */
  right?: ReactNode
  /** Content under the header (search field…). */
  children?: ReactNode
}

/**
 * Tab-level screen header (6.1): caption over title on the start side, up to
 * two icon buttons on the end side. Pushed list screens get a back button
 * above the title.
 */
export function ScreenHeader({ title, caption, backHref, right, children }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const isDark = useIsDark()
  useStatusBarStyle(isDark ? 'light' : 'dark')
  return (
    <View
      className="gap-3 bg-background px-5 pb-3"
      style={{ paddingTop: insets.top + spacing.top }}
    >
      {backHref ? (
        <View className="flex-row">
          <IconButton
            icon={ChevronLeft}
            label={t('common.goBack')}
            onPress={() => goBack(backHref)}
          />
        </View>
      ) : null}
      <View className="min-h-11 flex-row items-center gap-3">
        <View className="min-w-0 flex-1">
          {caption ? (
            <Text className={`${TYPE.caption} text-muted-foreground`} numberOfLines={1}>
              {caption}
            </Text>
          ) : null}
          <Text
            accessibilityRole="header"
            className={`${TYPE.title} text-foreground`}
            numberOfLines={2}
          >
            {title}
          </Text>
        </View>
        {right ? <View className="flex-row items-center gap-2">{right}</View> : null}
      </View>
      {children}
    </View>
  )
}
