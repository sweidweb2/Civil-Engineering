import { type ReactNode, useEffect } from 'react'
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type ViewStyle,
} from 'react-native'
import { router } from 'expo-router'
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

import { useStatusBarStyle } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { flipStyle, isRtlLayout } from '@/lib/rtl'
import { MONO_STYLE } from '@/theme/typography'

import {
  useWorkerPalette,
  WK_TAB_SPACE,
  WK_TONE_BG,
  WK_TONE_DOT,
  WK_TONE_TEXT,
  type WkTone,
} from './palette'

/* ─── Hero glow ────────────────────────────────────────────────────────── */

/**
 * Soft lime light in the hero's top-end corner. Mirrors the prototype's
 * `radial-gradient(circle, rgba(134,227,166,.2), transparent 68%)`: it fades
 * to nothing, so it reads as a glow, never as a disc with an edge.
 */
export function WkHeroGlow({ size = 260 }: { size?: number }) {
  const { c } = useWorkerPalette()
  return (
    <View
      pointerEvents="none"
      className="absolute -end-20 -top-24"
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="wkHeroGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={c.lime} stopOpacity={0.2} />
            <Stop offset="0.68" stopColor={c.lime} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill="url(#wkHeroGlow)" />
      </Svg>
    </View>
  )
}

/* ─── Type ─────────────────────────────────────────────────────────────── */

const MONO_TRACK = { letterSpacing: 0.9 }

/** Small uppercase mono label above a group ("SECTIONS", "TO FINISH · 3"). */
export function WkEyebrow({ children, hero }: { children: ReactNode; hero?: boolean }) {
  return (
    <Text
      className={`text-[11px] font-medium uppercase ${hero ? 'text-wk-hero-mute' : 'text-wk-ink3'}`}
      style={[MONO_STYLE, isRtlLayout() ? null : MONO_TRACK]}
    >
      {children}
    </Text>
  )
}

/** Eyebrow with the design's list-heading padding. */
export function WkGroupLabel({ children }: { children: ReactNode }) {
  return (
    <View className="px-1 pt-2">
      <WkEyebrow>{children}</WkEyebrow>
    </View>
  )
}

/** Re-export: mirrors directional icons (chevrons, arrows) in RTL. */
export { flipStyle }

/* ─── Screens ──────────────────────────────────────────────────────────── */

/** Top-level tab screen: scrolling column above the floating tab bar. */
export function WkTabScroll({
  children,
  refreshing,
  onRefresh,
  testID,
}: {
  children: ReactNode
  refreshing?: boolean
  /** Return the refetch promise so a failed refresh is reported (see usePullToRefresh). */
  onRefresh?: () => unknown
  testID?: string
}) {
  const insets = useSafeAreaInsets()
  const pull = usePullToRefresh()
  const { c, isDark } = useWorkerPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')
  return (
    <View className="flex-1 bg-wk-bg" testID={testID}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-5"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: WK_TAB_SPACE + insets.bottom,
        }}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(refreshing)}
              onRefresh={() => pull(onRefresh)}
              tintColor={c.ink3}
              colors={[c.brand]}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </View>
  )
}

function goBack(fallbackHref: string) {
  if (router.canGoBack()) router.back()
  else router.replace(fallbackHref as never)
}

/** Pushed-screen header: round back button, title, optional mono count. */
export function WkTopBar({
  title,
  backHref,
  count,
}: {
  title: string
  backHref: string
  count?: string
}) {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const { c, shadow, isDark } = useWorkerPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')
  return (
    <View
      className="flex-row items-center gap-2 bg-wk-bg px-3"
      style={{ paddingTop: insets.top + 4, height: insets.top + 64 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.goBack')}
        onPress={() => goBack(backHref)}
        className="size-11 items-center justify-center rounded-full bg-wk-sf active:opacity-70"
        style={shadow}
      >
        <View style={flipStyle()}>
          <ChevronLeft size={20} color={c.ink} strokeWidth={2} />
        </View>
      </Pressable>
      <Text
        className="min-w-0 flex-1 text-[17px] font-semibold text-wk-ink"
        numberOfLines={1}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {count ? (
        <Text className="me-2 text-[11px] font-medium uppercase text-wk-ink3" style={MONO_STYLE}>
          {count}
        </Text>
      ) : null}
    </View>
  )
}

/** Scroll body for a pushed screen (below WkTopBar). */
export function WkBodyScroll({
  children,
  bottom = 32,
  gap = 'gap-3.5',
}: {
  children: ReactNode
  bottom?: number
  gap?: string
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName={`${gap} px-5 pt-2`}
      contentContainerStyle={{ paddingBottom: bottom }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  )
}

/** Pinned bottom action area for forms. */
export function WkFooter({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <View className="bg-wk-bg px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
      {children}
    </View>
  )
}

/* ─── Surfaces ─────────────────────────────────────────────────────────── */

/** White rounded card with the design's soft shadow. */
export function WkCard({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: ViewStyle
}) {
  const { shadow } = useWorkerPalette()
  return (
    <View className={`rounded-[22px] bg-wk-sf p-[18px] ${className}`} style={[shadow, style]}>
      {children}
    </View>
  )
}

/** Rows separated by 1px hairlines inside one rounded card. */
export function WkGroup({ children }: { children: ReactNode }) {
  const { shadow } = useWorkerPalette()
  return (
    <View className="gap-px overflow-hidden rounded-[20px] bg-wk-line" style={shadow}>
      {children}
    </View>
  )
}

/** Rounded square holding an icon. `brand` = done / featured, `neutral` = pending. */
export function WkIconTile({
  icon: Icon,
  tone = 'brand',
  size = 40,
}: {
  icon: LucideIcon
  tone?: 'brand' | 'neutral' | 'hero'
  size?: number
}) {
  const { c } = useWorkerPalette()
  const bg = tone === 'brand' ? 'bg-wk-brand-soft' : tone === 'hero' ? 'bg-wk-sf' : 'bg-wk-sf2'
  const color = tone === 'brand' ? c.brand : c.ink2
  return (
    <View
      className={`items-center justify-center ${bg}`}
      style={{ width: size, height: size, borderRadius: size * 0.3 }}
    >
      <Icon size={Math.round(size * 0.48)} color={color} strokeWidth={1.9} />
    </View>
  )
}

/** Tappable row inside a WkGroup. */
export function WkRow({
  icon,
  iconTone = 'neutral',
  title,
  subtitle,
  subtitleClassName = 'text-wk-ink3',
  trailing,
  chevron = true,
  onPress,
  minHeight = 64,
  accessibilityLabel,
}: {
  icon?: LucideIcon
  iconTone?: 'brand' | 'neutral'
  title: string
  subtitle?: string | null
  subtitleClassName?: string
  trailing?: ReactNode
  chevron?: boolean
  onPress?: () => void
  minHeight?: number
  accessibilityLabel?: string
}) {
  const { c } = useWorkerPalette()
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center gap-3.5 bg-wk-sf px-4 py-3 active:bg-wk-sf2"
      style={{ minHeight }}
    >
      {icon ? <WkIconTile icon={icon} tone={iconTone} /> : null}
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-[15px] font-medium leading-5 text-wk-ink" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text className={`text-[13px] leading-[17px] ${subtitleClassName}`} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {chevron && onPress ? (
        <View style={flipStyle()}>
          <ChevronRight size={18} color={c.ink3} strokeWidth={1.9} />
        </View>
      ) : null}
    </Pressable>
  )
}

/** Rounded status pill. */
export function WkPill({
  label,
  tone,
  dot,
  size = 'sm',
}: {
  label: string
  tone: WkTone
  dot?: boolean
  size?: 'sm' | 'md'
}) {
  return (
    <View
      className={`flex-row items-center gap-1.5 self-start rounded-full ${WK_TONE_BG[tone]} ${
        size === 'sm' ? 'h-[22px] px-2' : 'h-7 px-2.5'
      }`}
    >
      {dot ? <View className={`size-1.5 rounded-full ${WK_TONE_DOT[tone]}`} /> : null}
      <Text
        className={`font-medium ${WK_TONE_TEXT[tone]} ${size === 'sm' ? 'text-[11px]' : 'text-[13px]'}`}
      >
        {label}
      </Text>
    </View>
  )
}

/* ─── Buttons ──────────────────────────────────────────────────────────── */

type WkButtonVariant = 'brand' | 'ink' | 'lime' | 'soft' | 'danger' | 'dangerSoft'

const BTN_BG: Record<WkButtonVariant, string> = {
  brand: 'bg-wk-brand',
  ink: 'bg-wk-ink',
  lime: 'bg-wk-lime',
  soft: 'bg-wk-sf2',
  danger: 'bg-wk-red',
  dangerSoft: 'bg-wk-red-soft',
}

const BTN_TEXT: Record<WkButtonVariant, string> = {
  brand: 'text-wk-on-brand',
  ink: 'text-wk-bg',
  lime: 'text-wk-on-lime',
  soft: 'text-wk-ink',
  danger: 'text-white',
  dangerSoft: 'text-wk-red',
}

export function WkButton({
  label,
  onPress,
  variant = 'brand',
  icon: Icon,
  iconAfter,
  loading,
  disabled,
  height = 52,
  compact,
  testID,
}: {
  label: string
  onPress: () => void
  variant?: WkButtonVariant
  icon?: LucideIcon
  /** Places the icon after the label (and mirrors it in RTL). */
  iconAfter?: boolean
  loading?: boolean
  disabled?: boolean
  height?: number
  /** Content-width button instead of full width. */
  compact?: boolean
  testID?: string
}) {
  const { c } = useWorkerPalette()
  const fg: Record<WkButtonVariant, string> = {
    brand: c.onBrand,
    ink: c.bg,
    lime: c.onLime,
    soft: c.ink,
    danger: '#FFFFFF',
    dangerSoft: c.red,
  }
  const iconEl = Icon ? (
    <View style={iconAfter ? flipStyle() : undefined}>
      <Icon size={18} color={fg[variant]} strokeWidth={2} />
    </View>
  ) : null
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      onPress={onPress}
      disabled={disabled || loading}
      className={`flex-row items-center justify-center gap-2 rounded-[14px] ${BTN_BG[variant]} ${
        compact ? 'px-3.5' : 'w-full px-4'
      } ${disabled ? 'opacity-45' : 'active:opacity-85'}`}
      style={{ height }}
    >
      {loading ? <ActivityIndicator size="small" color={fg[variant]} /> : iconAfter ? null : iconEl}
      <Text className={`text-[15px] font-semibold ${BTN_TEXT[variant]}`} numberOfLines={1}>
        {label}
      </Text>
      {!loading && iconAfter ? iconEl : null}
    </Pressable>
  )
}

/* ─── Progress ─────────────────────────────────────────────────────────── */

/** Lime completion ring on the hero card with the percent in the middle. */
export function WkProgressRing({ percent, size = 92 }: { percent: number; size?: number }) {
  const { c } = useWorkerPalette()
  const stroke = 8
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <View
      style={{ width: size, height: size }}
      className="items-center justify-center"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
    >
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={c.heroLine}
          strokeWidth={stroke}
          fill="none"
        />
        {clamped > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={c.lime}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={circ * (1 - clamped / 100)}
          />
        ) : null}
      </Svg>
      <Text
        className="text-2xl font-semibold text-wk-hero-ink"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {clamped}%
      </Text>
    </View>
  )
}

/** Thin brand bar used on the CV card. */
export function WkProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <View className="h-2 overflow-hidden rounded bg-wk-sf2">
      <View className="h-full rounded bg-wk-brand" style={{ width: `${clamped}%` }} />
    </View>
  )
}

/* ─── States ───────────────────────────────────────────────────────────── */

export function WkEmpty({
  icon: Icon,
  title,
  body,
  compact,
}: {
  icon: LucideIcon
  title: string
  body?: string
  compact?: boolean
}) {
  const { c, shadow } = useWorkerPalette()
  const tile = compact ? 64 : 72
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      className={`items-center gap-2.5 px-6 ${compact ? 'py-8' : 'mt-10 py-8'}`}
    >
      <View
        className="items-center justify-center bg-wk-sf"
        style={[shadow, { width: tile, height: tile, borderRadius: tile * 0.3 }]}
      >
        <Icon size={compact ? 28 : 30} color={c.brand} strokeWidth={1.75} />
      </View>
      <Text className="mt-1.5 text-center text-[17px] font-semibold text-wk-ink">{title}</Text>
      {body ? (
        <Text className="max-w-[280px] text-center text-[15px] leading-[22px] text-wk-ink2">
          {body}
        </Text>
      ) : null}
    </Animated.View>
  )
}

function usePulse() {
  const opacity = useSharedValue(1)
  useEffect(() => {
    opacity.set(withRepeat(withTiming(0.45, { duration: 600 }), -1, true))
  }, [opacity])
  return useAnimatedStyle(() => ({ opacity: opacity.value }))
}

/** Loading placeholder shaped like a list card. */
export function WkSkeletonCard() {
  const pulse = usePulse()
  return (
    <Animated.View
      className="h-[92px] flex-row gap-3.5 rounded-[20px] bg-wk-sf p-4"
      style={pulse}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View className="size-10 rounded-xl bg-wk-sf2" />
      <View className="flex-1 gap-2.5 pt-1">
        <View className="h-3 w-3/5 rounded-md bg-wk-sf2" />
        <View className="h-2.5 w-2/5 rounded bg-wk-sf2" />
      </View>
    </Animated.View>
  )
}

/** Error card with retry, in the worker palette. */
export function WkError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation()
  return (
    <WkCard className="gap-3">
      <Text className="text-[15px] font-semibold text-wk-red">{t('common.couldNotLoad')}</Text>
      <Text className="text-[13px] leading-5 text-wk-ink2">{message}</Text>
      {onRetry ? (
        <WkButton label={t('common.tryAgain')} variant="soft" height={44} onPress={onRetry} />
      ) : null}
    </WkCard>
  )
}

/* ─── Dialogs ──────────────────────────────────────────────────────────── */

export type WkConfirmState = {
  title: string
  body: string
  cta: string
  tone?: 'danger' | 'brand'
  onConfirm: () => void
}

/** Centered confirm dialog (replaces the native alert inside the worker portal). */
export function WkConfirm({
  state,
  onCancel,
}: {
  state: WkConfirmState | null
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const { c } = useWorkerPalette()
  if (!state) return null
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View className="flex-1 items-center justify-center px-7">
        <Pressable
          accessibilityLabel={t('common.cancel')}
          onPress={onCancel}
          className="absolute inset-0"
          style={{ backgroundColor: c.scrim }}
        />
        <Animated.View
          entering={ZoomIn.duration(220)}
          className="w-full max-w-[420px] gap-2 rounded-[26px] bg-wk-sf px-5 pb-5 pt-6"
          accessibilityViewIsModal
        >
          <Text
            className="text-[17px] font-semibold leading-[22px] text-wk-ink"
            accessibilityRole="header"
          >
            {state.title}
          </Text>
          <Text className="text-[15px] leading-[22px] text-wk-ink2">{state.body}</Text>
          <View className="mt-4 flex-row gap-2.5">
            <View className="flex-1">
              <WkButton label={t('common.cancel')} variant="soft" height={50} onPress={onCancel} />
            </View>
            <View className="flex-1">
              <WkButton
                label={state.cta}
                variant={state.tone === 'brand' ? 'brand' : 'danger'}
                height={50}
                onPress={state.onConfirm}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}
