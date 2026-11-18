import { type ReactNode, useCallback } from 'react'
import { Text, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { setStatusBarStyle } from 'expo-status-bar'
import { ChevronLeft, type LucideIcon } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Pressable } from '@/components/ui/pressable'
import { useIsDark, useThemeColors } from '@/hooks/useThemeColors'

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

/** Plain icon button (reference style: no outline, soft press state). */
export function IconButton({
  icon: Icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: LucideIcon
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  const colors = useThemeColors()
  const mirrored = Icon === ChevronLeft
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={6}
      className={`size-10 items-center justify-center rounded-full active:bg-muted ${
        disabled ? 'opacity-40' : ''
      }`}
      onPress={onPress}
    >
      {mirrored ? (
        <DirectionalIcon icon={Icon} size={24} color={colors.text} />
      ) : (
        <Icon size={22} color={colors.text} />
      )}
    </Pressable>
  )
}

type ScreenHeaderProps = {
  /** Never drawn on screen (the bottom tab bar shows where you are); read by screen readers. */
  title: string
  /** When set, shows a back button (for screens reached by push). */
  backHref?: string
  right?: ReactNode
  /** Content under the bar (search field, stats, profile card…). */
  children?: ReactNode
}

/**
 * Title-less top-level header: only the safe-area gap, plus a back button and
 * actions when a screen has them, and whatever the screen puts underneath.
 */
export function ScreenHeader({ title, backHref, right, children }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const isDark = useIsDark()
  useStatusBarStyle(isDark ? 'light' : 'dark')
  const hasBar = Boolean(backHref || right)
  return (
    <View className="bg-background px-5 pb-3" style={{ paddingTop: insets.top + 8 }}>
      {hasBar ? (
        <View className="min-h-11 flex-row items-center gap-2">
          {backHref ? (
            <View className="-ms-2">
              <IconButton
                icon={ChevronLeft}
                label={t('common.goBack')}
                onPress={() => goBack(backHref)}
              />
            </View>
          ) : null}
          <View className="min-w-0 flex-1" />
          {right ? <View className="flex-row items-center gap-2">{right}</View> : null}
        </View>
      ) : null}
      <Text
        accessibilityRole="header"
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
      >
        {title}
      </Text>
      {children ? <View className={`gap-3 ${hasBar ? 'mt-3' : ''}`}>{children}</View> : null}
    </View>
  )
}

type AppBarProps = {
  title: string
  subtitle?: string
  backHref: string
  right?: ReactNode
}

/** Compact bar for detail and form screens: ← Title ........ [actions]. */
export function AppBar({ title, subtitle, backHref, right }: AppBarProps) {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const isDark = useIsDark()
  useStatusBarStyle(isDark ? 'light' : 'dark')
  return (
    <View
      className="min-h-14 flex-row items-center gap-1 border-b border-border/50 bg-background px-3 pb-2"
      style={{ paddingTop: insets.top + 6 }}
    >
      <IconButton icon={ChevronLeft} label={t('common.goBack')} onPress={() => goBack(backHref)} />
      <View className="min-w-0 flex-1 ps-1">
        <Text
          className="text-lg font-bold text-foreground"
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View className="flex-row items-center gap-1">{right}</View> : null}
    </View>
  )
}
