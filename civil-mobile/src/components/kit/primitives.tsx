import { type ReactNode, useEffect } from 'react'
import { Pressable as RNPressable, type PressableProps, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { ChevronRight, type LucideIcon } from 'lucide-react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { withUniwind } from 'uniwind'

import { Pressable } from '@/components/ui/pressable'
import { useThemeColors } from '@/hooks/useThemeColors'
import { flipStyle, tracking } from '@/lib/rtl'
import { sizes } from '@/theme/sizes'
import { motion } from '@/theme/spacing'
import { MONO_STYLE, TYPE } from '@/theme/typography'

import { type Tone, TONE_COLOR, TONE_TEXT } from './tones'

const AnimatedPressable = withUniwind(Animated.createAnimatedComponent(RNPressable))
const EASE_OUT = Easing.out(Easing.quad)

/* ─── Text ──────────────────────────────────────────────────────────────── */

/** Tiny mono uppercase context label ("OCTOBER 2026"). The only uppercase text. */
export function Eyebrow({ children, className }: { children: string; className?: string }) {
  return (
    <Text
      className={`${TYPE.eyebrow} ${tracking('widest')} ${className ?? 'text-muted-foreground'}`}
      style={MONO_STYLE}
      numberOfLines={1}
    >
      {children}
    </Text>
  )
}

/* ─── Icons ─────────────────────────────────────────────────────────────── */

/** Icon that mirrors horizontally in RTL (chevrons, back arrows). */
export function DirectionalIcon({
  icon: Icon,
  size = sizes.iconSm,
  color,
  strokeWidth = sizes.iconStroke,
}: {
  icon: LucideIcon
  size?: number
  color: string
  strokeWidth?: number
}) {
  return <Icon size={size} color={color} strokeWidth={strokeWidth} style={flipStyle()} />
}

/**
 * Leading circle holding a line icon (merchant-mark style): `bg` fill, 1px
 * line, ink-2 icon. `tone` only changes the icon color when it carries a
 * problem (warning / danger); otherwise the mark stays neutral.
 */
export function IconTile({
  icon: Icon,
  tone = 'neutral',
  size = sizes.leading,
}: {
  icon: LucideIcon
  tone?: Tone
  size?: number
  /** Kept for API compatibility; marks are always circular. */
  round?: boolean
}) {
  const colors = useThemeColors()
  const color = tone === 'warning' || tone === 'danger' ? colors[TONE_COLOR[tone]] : colors.ink2
  return (
    <View
      className="items-center justify-center rounded-full border border-border bg-background"
      style={{ width: size, height: size }}
    >
      <Icon
        size={size >= 48 ? sizes.icon : sizes.iconSm}
        color={color}
        strokeWidth={sizes.iconStroke}
      />
    </View>
  )
}

/* ─── Identity ──────────────────────────────────────────────────────────── */

export function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/[\s@._-]+/)
    .filter(Boolean)
  const first = parts[0]?.[0] ?? '?'
  const second = parts.length > 1 ? (parts[1]?.[0] ?? '') : (parts[0]?.[1] ?? '')
  return (first + second).toUpperCase()
}

/** Circular avatar: image when available, ink circle with initials otherwise. */
export function Avatar({
  name,
  imageUrl,
  size = sizes.avatar,
}: {
  name: string
  imageUrl?: string | null
  size?: number
}) {
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full bg-inverse"
      style={{ width: size, height: size }}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size }}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text className="font-medium text-on-inverse" style={{ fontSize: Math.round(size * 0.32) }}>
          {initialsOf(name)}
        </Text>
      )}
    </View>
  )
}

/* ─── Surfaces ──────────────────────────────────────────────────────────── */

/** Level-2 surface: `surface` + 1px line, radius 20. No shadow. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View className={`rounded-xl border border-border bg-card p-5 ${className ?? ''}`}>
      {children}
    </View>
  )
}

/**
 * Pressable with a short functional press state (opacity dip, 140ms
 * ease-out). No springs: routine UI stays calm.
 */
export function PressableScale({
  children,
  className,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: PressableProps & { className?: string; scaleTo?: number; children: ReactNode }) {
  const opacity = useSharedValue(1)
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return (
    <AnimatedPressable
      {...rest}
      // withUniwind maps className → { $$css, tailwind }; styleq rejects undefined.
      className={className ?? ''}
      style={[animated, style as never]}
      onPressIn={(e) => {
        opacity.set(withTiming(0.7, { duration: motion.fast, easing: EASE_OUT }))
        onPressIn?.(e)
      }}
      onPressOut={(e) => {
        opacity.set(withTiming(1, { duration: motion.fast, easing: EASE_OUT }))
        onPressOut?.(e)
      }}
    >
      {children}
    </AnimatedPressable>
  )
}

/* ─── Grouped list ──────────────────────────────────────────────────────── */

/** Grouped list container (6.9): surface, 1px line, radius 16. */
export function MenuGroup({ children }: { children: ReactNode }) {
  return <View className="overflow-hidden rounded-lg border border-border bg-card">{children}</View>
}

/** Grouped-list row: optional leading mark, label (+ hint), one trailing element. */
export function MenuRow({
  icon,
  tone = 'neutral',
  label,
  hint,
  hintTone,
  onPress,
  last = false,
  trailing,
}: {
  icon?: LucideIcon
  tone?: Tone
  label: string
  hint?: string
  /** Colors the hint when it carries good news or a problem. */
  hintTone?: Tone
  onPress?: () => void
  last?: boolean
  trailing?: ReactNode
}) {
  const colors = useThemeColors()
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
      disabled={!onPress}
      className={`min-h-[60px] flex-row items-center gap-3 px-4 py-3.5 active:bg-background ${
        last ? '' : 'border-b border-line-subtle'
      }`}
      onPress={onPress}
    >
      {icon ? <IconTile icon={icon} tone={tone} /> : null}
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          className={`${TYPE.bodyStrong} ${tone === 'danger' ? 'text-destructive' : 'text-foreground'}`}
          numberOfLines={1}
        >
          {label}
        </Text>
        {hint ? (
          <Text
            className={`${TYPE.micro} ${hintTone ? TONE_TEXT[hintTone] : 'text-muted-2'}`}
            numberOfLines={1}
          >
            {hint}
          </Text>
        ) : null}
      </View>
      {trailing ??
        (onPress ? (
          <DirectionalIcon icon={ChevronRight} size={sizes.iconSm} color={colors.deEmphasis} />
        ) : null)}
    </Pressable>
  )
}

/* ─── Loading ───────────────────────────────────────────────────────────── */

/** Skeleton block: `line` fill with a 1.2s opacity pulse (static under reduce motion). */
export function SkeletonBlock({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion()
  const opacity = useSharedValue(1)
  useEffect(() => {
    if (reduceMotion) return
    opacity.set(
      withRepeat(
        withSequence(
          withTiming(0.5, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      ),
    )
  }, [opacity, reduceMotion])
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return <Animated.View className={`bg-border ${className ?? ''}`} style={style} />
}
/** Identity block for profile / settings screens (archetype F). */
export function IdentityBlock({
  name,
  detail,
  imageUrl,
  onPress,
  accessibilityLabel,
}: {
  name: string
  detail?: string
  imageUrl?: string | null
  onPress?: () => void
  accessibilityLabel?: string
}) {
  const colors = useThemeColors()
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? name}
      disabled={!onPress}
      className="flex-row items-center gap-4 active:opacity-70"
      onPress={onPress}
    >
      <Avatar name={name} imageUrl={imageUrl} size={sizes.avatarLg} />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className={`${TYPE.title} text-foreground`} numberOfLines={1}>
          {name}
        </Text>
        {detail ? (
          <Text className={`${TYPE.caption} text-muted-foreground`} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {onPress ? (
        <DirectionalIcon icon={ChevronRight} size={sizes.iconSm} color={colors.deEmphasis} />
      ) : null}
    </Pressable>
  )
}
