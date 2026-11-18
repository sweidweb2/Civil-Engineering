import { type ReactNode, useEffect } from 'react'
import {
  I18nManager,
  Pressable as RNPressable,
  type PressableProps,
  Text,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import type { LucideIcon } from 'lucide-react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { withUniwind } from 'uniwind'

import { useThemeColors } from '@/hooks/useThemeColors'
import { softShadows } from '@/theme/shadows'

import { AnimatedNumber } from './AnimatedNumber'
import { type Tone, TONE_BG, TONE_COLOR, TONE_DOT, TONE_TEXT } from './tones'

const AnimatedPressable = withUniwind(Animated.createAnimatedComponent(RNPressable))

/** Rounded status chip with a leading dot. */
export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <View className={`flex-row items-center gap-1.5 rounded-full px-3 py-1 ${TONE_BG[tone]}`}>
      <View className={`size-1.5 rounded-full ${TONE_DOT[tone]}`} />
      <Text className={`text-xs font-semibold ${TONE_TEXT[tone]}`} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

/** Small tinted square holding an icon. */
export function IconTile({
  icon: Icon,
  tone = 'primary',
  size = 44,
}: {
  icon: LucideIcon
  tone?: Tone
  size?: number
}) {
  const colors = useThemeColors()
  return (
    <View
      className={`items-center justify-center rounded-2xl ${TONE_BG[tone]}`}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.46)} color={colors[TONE_COLOR[tone]]} />
    </View>
  )
}

export function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/[\s@._-]+/)
    .filter(Boolean)
  const first = parts[0]?.[0] ?? '?'
  const second = parts.length > 1 ? (parts[1]?.[0] ?? '') : (parts[0]?.[1] ?? '')
  return (first + second).toUpperCase()
}

/** Circular avatar: image when available, initials otherwise. */
export function Avatar({
  name,
  imageUrl,
  size = 44,
  onHero = false,
}: {
  name: string
  imageUrl?: string | null
  size?: number
  /** Light-on-dark variant for use inside the hero header. */
  onHero?: boolean
}) {
  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-full ${
        onHero ? 'border-2 border-hero-foreground/30 bg-hero-foreground/20' : 'bg-primary/10'
      }`}
      style={{ width: size, height: size }}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size }}
          contentFit="cover"
        />
      ) : (
        <Text
          className={`font-bold ${onHero ? 'text-hero-foreground' : 'text-primary'}`}
          style={{ fontSize: Math.round(size * 0.36) }}
        >
          {initialsOf(name)}
        </Text>
      )}
    </View>
  )
}

/** Soft, tint-shadowed surface used for every card in the app. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View
      className={`rounded-3xl border border-border/40 bg-card p-5 ${className ?? ''}`}
      style={softShadows.card}
    >
      {children}
    </View>
  )
}

/**
 * Pressable with a springy scale-down. The tactile feedback is what makes a
 * card feel like a physical object instead of a flat rectangle.
 */
export function PressableScale({
  children,
  className,
  style,
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  ...rest
}: PressableProps & { className?: string; scaleTo?: number; children: ReactNode }) {
  const scale = useSharedValue(1)
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  return (
    <AnimatedPressable
      {...rest}
      // withUniwind maps className → { $$css, tailwind }; styleq rejects undefined.
      className={className ?? ''}
      style={[animated, style as never]}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, { damping: 18, stiffness: 320 }))
        onPressIn?.(e)
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, { damping: 14, stiffness: 260 }))
        onPressOut?.(e)
      }}
    >
      {children}
    </AnimatedPressable>
  )
}

export function ProgressBar({ value, tone = 'primary' }: { value: number; tone?: Tone }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const width = useSharedValue(0)
  useEffect(() => {
    width.value = withTiming(pct, { duration: 700, easing: Easing.out(Easing.cubic) })
  }, [pct, width])
  const fill = useAnimatedStyle(() => ({ width: `${width.value}%` }))
  return (
    <View
      className="h-2 overflow-hidden rounded-full bg-muted"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <Animated.View className={`h-full rounded-full ${TONE_DOT[tone]}`} style={fill} />
    </View>
  )
}

/** Big-number metric tile: value first, label second (value carries the weight). */
export function StatCard({
  icon,
  tone = 'primary',
  label,
  value,
  onPress,
}: {
  icon: LucideIcon
  tone?: Tone
  label: string
  value: string
  onPress?: () => void
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      className="min-w-[46%] flex-1 gap-4 rounded-3xl border border-border/40 bg-card p-4"
      style={softShadows.card}
      onPress={onPress}
    >
      <View className="flex-row items-center justify-between">
        <IconTile icon={icon} tone={tone} size={40} />
        <View className={`size-2 rounded-full ${TONE_DOT[tone]} opacity-60`} />
      </View>
      <View className="gap-0.5">
        <AnimatedNumber
          value={value}
          className="font-bold text-foreground"
          fontSize={32}
          lineHeight={36}
        />
        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
          {label}
        </Text>
      </View>
    </PressableScale>
  )
}

/** Label / value line used on detail screens. */
export function InfoRow({
  icon: Icon,
  label,
  value,
  last = false,
}: {
  icon?: LucideIcon
  label: string
  value: string
  last?: boolean
}) {
  const colors = useThemeColors()
  return (
    <View className={`flex-row items-start gap-3 py-3 ${last ? '' : 'border-b border-border/60'}`}>
      {Icon ? (
        <View className="pt-0.5">
          <Icon size={18} color={colors.textMuted} />
        </View>
      ) : null}
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </Text>
        <Text className="text-base text-foreground">{value}</Text>
      </View>
    </View>
  )
}

/** Uppercase caption above a group of cards. */
export function SectionLabel({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between px-1">
      <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {children}
      </Text>
      {action}
    </View>
  )
}

/** Square card thumbnail: the image when there is one, a tinted icon otherwise. */
export function Thumbnail({
  imageUrl,
  icon: Icon,
  size = 64,
}: {
  imageUrl?: string | null
  icon: LucideIcon
  size?: number
}) {
  const colors = useThemeColors()
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-2xl bg-primary/10"
      style={{ width: size, height: size }}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size }}
          contentFit="cover"
        />
      ) : (
        <Icon size={Math.round(size * 0.4)} color={colors.primary} />
      )}
    </View>
  )
}

/** Translucent KPI tile for the inside of a HeroHeader: value first, label second. */
export function HeroStat({
  label,
  value,
  onPress,
}: {
  label: string
  value: string
  onPress?: () => void
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      disabled={!onPress}
      scaleTo={0.95}
      className="min-w-0 flex-1 gap-0.5 rounded-2xl border border-hero-foreground/20 bg-hero-foreground/15 px-4 py-3"
      onPress={onPress}
    >
      <AnimatedNumber
        value={value}
        className="font-bold text-hero-foreground"
        fontSize={24}
        lineHeight={32}
        numberOfLines={1}
      />
      <Text className="text-xs font-medium text-hero-foreground/80" numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  )
}

/** Big round icon + caption, used in "quick actions" rows. */
export function ActionTile({
  icon,
  label,
  tone = 'primary',
  onPress,
}: {
  icon: LucideIcon
  label: string
  tone?: Tone
  onPress: () => void
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      scaleTo={0.92}
      className="min-w-0 flex-1 items-center gap-2"
      onPress={onPress}
    >
      <IconTile icon={icon} tone={tone} size={60} />
      <Text className="text-center text-xs font-semibold text-foreground" numberOfLines={2}>
        {label}
      </Text>
    </PressableScale>
  )
}

/** Icon that mirrors horizontally in RTL (chevrons, back arrows). */
export function DirectionalIcon({
  icon: Icon,
  size = 18,
  color,
}: {
  icon: LucideIcon
  size?: number
  color: string
}) {
  return (
    <Icon
      size={size}
      color={color}
      style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}
    />
  )
}

/** Pulsing placeholder block for skeleton screens. */
export function SkeletonBlock({ className }: { className?: string }) {
  const opacity = useSharedValue(1)
  useEffect(() => {
    opacity.set(
      withRepeat(
        withSequence(
          withTiming(0.45, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      ),
    )
  }, [opacity])
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return <Animated.View className={`bg-muted ${className ?? ''}`} style={style} />
}
