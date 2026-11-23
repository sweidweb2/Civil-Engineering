import { Children, type ReactNode, useEffect } from 'react'
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
import { MONO_STYLE, NUM_STYLE, TYPE } from '@/theme/typography'

import { AnimatedNumber } from './AnimatedNumber'
import { type Tone, TONE_BG, TONE_COLOR, TONE_DOT, TONE_TEXT } from './tones'

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

/* ─── State ─────────────────────────────────────────────────────────────── */

/** Filled state pill ("Pending", "Approved"). Only for state, never decoration. */
export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <View className={`rounded-full px-2 py-1 ${TONE_BG[tone]}`}>
      <Text className={`${TYPE.micro} font-medium ${TONE_TEXT[tone]}`} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

/** Thin progress bar: `line` track, accent fill (progress is meaning). */
export function ProgressBar({ value, tone = 'primary' }: { value: number; tone?: Tone }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const reduceMotion = useReducedMotion()
  const width = useSharedValue(reduceMotion ? pct : 0)
  useEffect(() => {
    width.value = reduceMotion
      ? pct
      : withTiming(pct, { duration: motion.slow, easing: Easing.bezier(0.2, 0, 0, 1) })
  }, [pct, width, reduceMotion])
  const fill = useAnimatedStyle(() => ({ width: `${width.value}%` }))
  return (
    <View
      className="overflow-hidden rounded-sm bg-border"
      style={{ height: sizes.progress }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <Animated.View className={`h-full rounded-sm ${TONE_DOT[tone]}`} style={fill} />
    </View>
  )
}

export type Segment = { label: string; value: number; display?: string }

const SEGMENT_FILLS = ['bg-foreground', 'bg-data-2', 'bg-data-3', 'bg-line-strong'] as const

/**
 * Segmented proportional bar + legend (section 6.4). Segments use ink tints
 * in order; `highlightLast` paints the final segment in accent when it is the
 * good thing to point at (e.g. "completed").
 */
export function SegmentedBar({
  segments,
  highlightLast = false,
  onSegmentPress,
}: {
  segments: Segment[]
  highlightLast?: boolean
  onSegmentPress?: (index: number) => void
}) {
  const shown = segments.filter((segment) => segment.value > 0)
  const total = shown.reduce((sum, segment) => sum + segment.value, 0)
  const fillFor = (index: number) =>
    highlightLast && index === segments.length - 1
      ? 'bg-primary'
      : SEGMENT_FILLS[Math.min(index, SEGMENT_FILLS.length - 1)]
  const description = segments
    .map((segment) => `${segment.label} ${segment.display ?? segment.value}`)
    .join(', ')
  return (
    <View className="gap-3" style={{ direction: 'ltr' }}>
      <View
        className="flex-row"
        style={{ height: sizes.progress, gap: sizes.segmentGap }}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={description}
      >
        {total === 0 ? (
          <View className="flex-1 rounded-sm bg-border" />
        ) : (
          shown.map((segment, i) => {
            const index = segments.indexOf(segment)
            const first = i === 0
            const last = i === shown.length - 1
            return (
              <View
                key={segment.label}
                className={fillFor(index)}
                style={{
                  flexGrow: segment.value,
                  borderTopStartRadius: first ? 4 : 0,
                  borderBottomStartRadius: first ? 4 : 0,
                  borderTopEndRadius: last ? 4 : 0,
                  borderBottomEndRadius: last ? 4 : 0,
                }}
              />
            )
          })
        )}
      </View>
      <View className="flex-row flex-wrap" style={{ columnGap: 16, rowGap: 6 }}>
        {segments.map((segment, index) => {
          const content = (
            <>
              <View className={`size-2 rounded-xs ${fillFor(index)}`} />
              <Text className={`${TYPE.micro} text-muted-foreground`}>
                {segment.label}{' '}
                <Text className="text-ink-2" style={NUM_STYLE}>
                  {segment.display ?? segment.value}
                </Text>
              </Text>
            </>
          )
          return onSegmentPress ? (
            <Pressable
              key={segment.label}
              accessibilityRole="button"
              accessibilityLabel={`${segment.label} ${segment.display ?? segment.value}`}
              hitSlop={{ top: 14, bottom: 14, left: 4, right: 4 }}
              className="flex-row items-center gap-1.5 active:opacity-60"
              onPress={() => onSegmentPress(index)}
            >
              {content}
            </Pressable>
          ) : (
            <View key={segment.label} className="flex-row items-center gap-1.5">
              {content}
            </View>
          )
        })}
      </View>
    </View>
  )
}

/* ─── Hero ──────────────────────────────────────────────────────────────── */

/** Splits "1,284.50" into whole + fraction so the fraction can step down. */
function splitNumber(value: string): [string, string] {
  const match = /^(.*\d)([.,]\d+)$/.exec(value)
  return match ? [match[1]!, match[2]!] : [value, '']
}

/**
 * The one hero per screen (section 6.3): caption label → display number →
 * context line → optional extras. No card; it sits directly on `bg`.
 */
export function HeroMetric({
  label,
  value,
  context,
  onPress,
  children,
}: {
  label: string
  value: string
  context?: string
  onPress?: () => void
  children?: ReactNode
}) {
  const [whole, fraction] = splitNumber(value)
  const head = (
    <>
      <Text className={`${TYPE.caption} text-muted-foreground`}>{label}</Text>
      <View className="flex-row items-baseline">
        <AnimatedNumber
          value={whole}
          className="font-semibold text-foreground"
          fontSize={56}
          lineHeight={60}
          numberOfLines={1}
        />
        {fraction ? (
          <Text className={`${TYPE.displaySub} text-de-emphasis`} style={NUM_STYLE}>
            {fraction}
          </Text>
        ) : null}
      </View>
      {context ? <Text className={`${TYPE.bodySm} text-muted-foreground`}>{context}</Text> : null}
    </>
  )
  return (
    <View className="gap-3.5">
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value}`}
          className="gap-1 active:opacity-70"
          onPress={onPress}
        >
          {head}
        </Pressable>
      ) : (
        <View className="gap-1" accessible accessibilityLabel={`${label}: ${value}`}>
          {head}
        </View>
      )}
      {children}
    </View>
  )
}

/**
 * Back-compat wrapper: older dashboards pass `caption/value/stats`. Renders a
 * HeroMetric with a segmented bar when every stat is numeric, otherwise a
 * context line joining the stats with " · ".
 */
export function HeroCard({
  caption,
  value,
  stats,
  onPress,
  highlightLast = false,
}: {
  caption: string
  value: string
  stats?: { label: string; value: string; onPress?: () => void }[]
  onPress?: () => void
  /** Kept for API compatibility; the hero never carries a decorative icon. */
  icon?: LucideIcon
  highlightLast?: boolean
}) {
  const numeric = (stats ?? []).map((stat) => Number(stat.value.replace(/[^\d.-]/g, '')))
  const allNumeric =
    stats && stats.length > 0 && numeric.every((n, i) => /\d/.test(stats[i]!.value) && !isNaN(n))
  return (
    <HeroMetric
      label={caption}
      value={value}
      onPress={onPress}
      context={
        stats && stats.length > 0 && !allNumeric
          ? stats.map((stat) => `${stat.label} ${stat.value}`).join(' · ')
          : undefined
      }
    >
      {allNumeric ? (
        <SegmentedBar
          highlightLast={highlightLast}
          segments={stats!.map((stat, i) => ({
            label: stat.label,
            value: numeric[i]!,
            display: stat.value,
          }))}
          onSegmentPress={
            stats!.some((stat) => stat.onPress) ? (i) => stats![i]?.onPress?.() : undefined
          }
        />
      ) : null}
    </HeroMetric>
  )
}

/** Inline key figure (section 6.5): label left, mono figure right. */
export function StatRow({
  label,
  value,
  positive = false,
  onPress,
}: {
  label: string
  value: string
  /** Accent when the figure is good guidance. */
  positive?: boolean
  onPress?: () => void
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}
      disabled={!onPress}
      className="min-h-11 flex-row items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3.5 active:bg-background"
      onPress={onPress}
    >
      <Text className={`${TYPE.bodySm} min-w-0 flex-1 text-ink-2`} numberOfLines={2}>
        {label}
      </Text>
      <Text
        className={`text-base font-medium ${positive ? 'text-primary' : 'text-foreground'}`}
        style={MONO_STYLE}
      >
        {value}
      </Text>
    </Pressable>
  )
}

/**
 * Inverse feature banner (section 6.7). States a result, not a call to
 * action. Max one per screen.
 */
export function FeatureBanner({
  eyebrow,
  title,
  onPress,
}: {
  eyebrow: string
  title: string
  onPress: () => void
}) {
  const colors = useThemeColors()
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${eyebrow}. ${title}`}
      className="flex-row items-center gap-3.5 rounded-md bg-inverse py-3.5 pe-3.5 ps-4 active:opacity-90"
      onPress={onPress}
    >
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className={`${TYPE.micro} text-on-inverse-muted`} numberOfLines={1}>
          {eyebrow}
        </Text>
        <Text className={`${TYPE.bodyStrong} text-on-inverse`} numberOfLines={2}>
          {title}
        </Text>
      </View>
      <DirectionalIcon icon={ChevronRight} size={sizes.iconSm} color={colors.onInverse} />
    </Pressable>
  )
}

/** Metric tile: caption label above, figure below. Surface + 1px line. */
export function StatCard({
  label,
  value,
  onPress,
}: {
  /** Kept for API compatibility; tiles carry no decorative icon. */
  icon?: LucideIcon
  tone?: Tone
  label: string
  value: string
  onPress?: () => void
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}
      disabled={!onPress}
      className="min-w-[46%] flex-1 gap-1 rounded-md border border-border bg-card px-4 py-3.5 active:bg-background"
      onPress={onPress}
    >
      <Text className={`${TYPE.caption} text-muted-foreground`} numberOfLines={1}>
        {label}
      </Text>
      <AnimatedNumber
        value={value}
        className="font-semibold text-foreground"
        fontSize={20}
        lineHeight={26}
        numberOfLines={1}
      />
    </Pressable>
  )
}

/** Compact KPI tile (same anatomy as StatCard, shares a row). */
export function StatTile({
  label,
  value,
  onPress,
}: {
  label: string
  value: string
  onPress?: () => void
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}
      disabled={!onPress}
      className="min-w-0 flex-1 gap-1 rounded-md border border-border bg-card px-4 py-3.5 active:bg-background"
      onPress={onPress}
    >
      <Text className={`${TYPE.caption} text-muted-foreground`} numberOfLines={1}>
        {label}
      </Text>
      <AnimatedNumber
        value={value}
        className="font-semibold text-foreground"
        fontSize={20}
        lineHeight={26}
        numberOfLines={1}
      />
    </Pressable>
  )
}

/**
 * Label / value fact row for detail screens (archetype C): label muted on
 * the start side, value ink on the end side. Use inside `MenuGroup`.
 */
export function InfoRow({
  label,
  value,
  last = false,
}: {
  /** Kept for API compatibility; fact rows carry no icon. */
  icon?: LucideIcon
  label: string
  value: string
  last?: boolean
}) {
  return (
    <View
      className={`flex-row items-start justify-between gap-4 py-3.5 ${
        last ? '' : 'border-b border-line-subtle'
      }`}
    >
      <Text className={`${TYPE.bodySm} shrink-0 text-muted-foreground`}>{label}</Text>
      <Text
        className={`${TYPE.bodyStrong} min-w-0 flex-1 text-end text-foreground`}
        style={NUM_STYLE}
      >
        {value}
      </Text>
    </View>
  )
}

/* ─── Sections ──────────────────────────────────────────────────────────── */

/** Section header (6.8): section title + optional "See all". */
export function SectionLabel({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <View className="flex-row items-baseline justify-between gap-3">
      <Text
        accessibilityRole="header"
        className={`${TYPE.section} min-w-0 flex-1 text-foreground`}
        numberOfLines={1}
      >
        {children}
      </Text>
      {action}
    </View>
  )
}

/** "See all" caption link with a 44px hit area that does not change layout. */
export function SeeAll({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      hitSlop={{ top: 13, bottom: 13, left: 8, right: 8 }}
      className="active:opacity-60"
      onPress={onPress}
    >
      <Text className={`${TYPE.caption} text-muted-foreground`}>{label}</Text>
    </Pressable>
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

/** Progress list row: title + % on one line, thin bar, caption below. */
export function ProgressRow({
  title,
  caption,
  value,
  barTone = 'primary',
  onPress,
  last = false,
}: {
  /** Kept for API compatibility; progress rows carry no icon. */
  icon?: LucideIcon
  tone?: Tone
  title: string
  caption?: string
  value: number
  barTone?: Tone
  onPress?: () => void
  last?: boolean
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${title}: ${pct}%`}
      disabled={!onPress}
      className={`gap-2 px-4 py-3.5 active:bg-background ${last ? '' : 'border-b border-line-subtle'}`}
      onPress={onPress}
    >
      <View className="flex-row items-baseline justify-between gap-3">
        <Text className={`${TYPE.bodyStrong} min-w-0 flex-1 text-foreground`} numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-base text-foreground" style={MONO_STYLE}>
          {pct}%
        </Text>
      </View>
      <ProgressBar value={pct} tone={barTone} />
      {caption ? (
        <Text className={`${TYPE.micro} text-muted-2`} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </Pressable>
  )
}

/** Square thumbnail: the image when there is one, a muted line icon otherwise. */
export function Thumbnail({
  imageUrl,
  icon: Icon,
  size = 56,
}: {
  imageUrl?: string | null
  icon: LucideIcon
  size?: number
}) {
  const colors = useThemeColors()
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-md border border-border bg-background"
      style={{ width: size, height: size }}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size }}
          contentFit="cover"
        />
      ) : (
        <Icon size={sizes.icon} color={colors.muted} strokeWidth={sizes.iconStroke} />
      )}
    </View>
  )
}

/* ─── Quick actions ─────────────────────────────────────────────────────── */

/** 4-column quick-action grid (6.6). Pads short rows so columns stay equal. */
export function QuickActions({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).slice(0, 4)
  return (
    <View className="flex-row">
      {items}
      {Array.from({ length: 4 - items.length }, (_, i) => (
        <View key={`pad${i}`} className="flex-1" />
      ))}
    </View>
  )
}

/** Quick action: 52 circle with a 20px line icon, one-word label below. */
export function ActionTile({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon
  label: string
  /** Kept for API compatibility; actions are monochrome. */
  tone?: Tone
  onPress: () => void
}) {
  const colors = useThemeColors()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className="min-w-0 flex-1 items-center gap-2 active:opacity-60"
      onPress={onPress}
    >
      <View
        className="items-center justify-center rounded-full border border-border bg-card"
        style={{ width: sizes.quickAction, height: sizes.quickAction }}
      >
        <Icon size={sizes.icon} color={colors.ink} strokeWidth={sizes.iconStroke} />
      </View>
      <Text className={`${TYPE.micro} text-center font-medium text-foreground`} numberOfLines={2}>
        {label}
      </Text>
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

/**
 * Inline status notice: surface + 1px line, a line icon in the meaning color
 * (accent = good, warning, negative), a statement and one supporting line.
 * Optional `action` renders below (e.g. a text button).
 */
export function Notice({
  icon: Icon,
  tone = 'neutral',
  title,
  description,
  action,
}: {
  icon: LucideIcon
  tone?: Tone
  title: string
  description?: string
  action?: ReactNode
}) {
  const colors = useThemeColors()
  return (
    <View className="gap-3 rounded-md border border-border bg-card px-4 py-3.5">
      <View className="flex-row items-start gap-3">
        <Icon size={sizes.icon} color={colors[TONE_COLOR[tone]]} strokeWidth={sizes.iconStroke} />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className={`${TYPE.bodyStrong} text-foreground`}>{title}</Text>
          {description ? (
            <Text className={`${TYPE.bodySm} text-muted-foreground`}>{description}</Text>
          ) : null}
        </View>
      </View>
      {action}
    </View>
  )
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

/** Container for label / value fact rows (InfoRow) on detail screens. */
export function FactGroup({ children }: { children: ReactNode }) {
  return <View className="rounded-lg border border-border bg-card px-4">{children}</View>
}
