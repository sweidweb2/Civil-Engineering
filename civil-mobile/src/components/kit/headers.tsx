import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { ChevronLeft, type LucideIcon } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Pressable } from '@/components/ui/pressable'
import { useThemeColors } from '@/hooks/useThemeColors'

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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={8}
      className={`size-10 items-center justify-center rounded-full active:opacity-70 ${
        onHero ? 'bg-hero-foreground/15' : 'border border-border/60 bg-card'
      } ${disabled ? 'opacity-40' : ''}`}
      onPress={onPress}
    >
      <Icon size={20} color={onHero ? '#FFFFFF' : colors.text} />
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
  return (
    <View
      className="overflow-hidden rounded-b-[32px] bg-hero px-5 pb-5"
      style={{ paddingTop: insets.top + 12 }}
    >
      {/* Decorative blueprint rings */}
      <View
        pointerEvents="none"
        className="absolute -right-16 -top-16 size-56 rounded-full border-[28px] border-hero-foreground/5"
      />
      <View
        pointerEvents="none"
        className="absolute -left-10 bottom-[-70px] size-40 rounded-full border-[20px] border-hero-foreground/5"
      />

      <View className="flex-row items-center gap-3">
        {backHref ? (
          <IconButton icon={ChevronLeft} label="Go back" onHero onPress={() => goBack(backHref)} />
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
            className="text-[28px] font-bold leading-9 text-hero-foreground"
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-sm text-hero-foreground/75" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View className="flex-row items-center gap-2">{right}</View> : null}
      </View>

      {children ? <View className="mt-4 gap-3">{children}</View> : null}
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
  return (
    <View
      className="flex-row items-center gap-3 bg-background px-4 pb-3"
      style={{ paddingTop: insets.top + 8 }}
    >
      <IconButton icon={ChevronLeft} label="Go back" onPress={() => goBack(backHref)} />
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
