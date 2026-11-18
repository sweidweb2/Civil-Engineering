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

/** Round icon button. `onHero` renders light-on-teal for the hero header. */
export function IconButton({
  icon: Icon,
  label,
  onPress,
  onHero = false,
  disabled = false,
}: {
  icon: LucideIcon
  label: string
  onPress: () => void
  onHero?: boolean
  disabled?: boolean
}) {
  const colors = useThemeColors()
  const mirrored = Icon === ChevronLeft
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={8}
      className={`size-10 items-center justify-center rounded-full active:opacity-70 ${
        onHero
          ? 'border border-hero-foreground/20 bg-hero-foreground/15'
          : 'border border-border/40 bg-card'
      } ${disabled ? 'opacity-40' : ''}`}
      onPress={onPress}
    >
      {mirrored ? (
        <DirectionalIcon icon={Icon} size={20} color={onHero ? '#FFFFFF' : colors.text} />
      ) : (
        <Icon size={20} color={onHero ? '#FFFFFF' : colors.text} />
      )}
    </Pressable>
  )
}

type HeroHeaderProps = {
  title: string
  /** Small caption above the title. */
  eyebrow?: string
  subtitle?: string
  /** When set, shows a back button (for screens reached by push). */
  backHref?: string
  right?: ReactNode
  /** Extra content inside the hero (search bar, stats…). */
  children?: ReactNode
}

/**
 * Large teal header for top-level screens.
 * Handles the status-bar inset itself.
 */
export function HeroHeader({
  title,
  eyebrow,
  subtitle,
  backHref,
  right,
  children,
}: HeroHeaderProps) {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  useStatusBarStyle('light')
  return (
    <View
      className="overflow-hidden rounded-b-[36px] bg-hero px-5 pb-6"
      style={{ paddingTop: insets.top + 12 }}
    >
      {/* Layered glow + blueprint rings: depth without a gradient dependency */}
      <View
        pointerEvents="none"
        className="absolute -right-20 -top-24 size-72 rounded-full bg-hero-foreground/10"
      />
      <View
        pointerEvents="none"
        className="absolute -right-8 -top-10 size-44 rounded-full bg-hero-foreground/10"
      />
      <View
        pointerEvents="none"
        className="absolute -left-12 bottom-[-80px] size-48 rounded-full border-[22px] border-hero-foreground/10"
      />
      <View
        pointerEvents="none"
        className="absolute inset-x-0 bottom-0 h-px bg-hero-foreground/20"
      />

      <View className="flex-row items-center gap-3">
        {backHref ? (
          <IconButton
            icon={ChevronLeft}
            label={t('common.goBack')}
            onHero
            onPress={() => goBack(backHref)}
          />
        ) : null}
        <View className="min-w-0 flex-1">
          {eyebrow ? (
            <Text
              className="text-xs font-semibold uppercase tracking-widest text-hero-foreground/70"
              numberOfLines={1}
            >
              {eyebrow}
            </Text>
          ) : null}
          <Text
            className="text-[30px] font-bold leading-9 tracking-tight text-hero-foreground"
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-sm text-hero-foreground/80" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View className="flex-row items-center gap-2">{right}</View> : null}
      </View>

      {children ? <View className="mt-5 gap-3">{children}</View> : null}
    </View>
  )
}

type AppBarProps = {
  title: string
  subtitle?: string
  backHref: string
  right?: ReactNode
}

/** Compact bar for detail and form screens. */
export function AppBar({ title, subtitle, backHref, right }: AppBarProps) {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const isDark = useIsDark()
  useStatusBarStyle(isDark ? 'light' : 'dark')
  return (
    <View
      className="flex-row items-center gap-3 bg-background px-4 pb-3"
      style={{ paddingTop: insets.top + 8 }}
    >
      <IconButton icon={ChevronLeft} label={t('common.goBack')} onPress={() => goBack(backHref)} />
      <View className="min-w-0 flex-1">
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
      {right ? <View className="flex-row items-center gap-2">{right}</View> : null}
    </View>
  )
}
