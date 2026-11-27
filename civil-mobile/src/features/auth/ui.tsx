import { type ReactNode, type Ref, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  Pressable as RNPressable,
  Text,
  TextInput,
  type TextInputInstance,
  type TextInputProps,
  View,
} from 'react-native'
import {
  ArrowRight,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  HardHat,
  type LucideIcon,
} from 'lucide-react-native'
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg'

import { Pressable } from '@/components/ui/pressable'
import { useWkPalette } from '@/components/wk/palette'
import { ltrInputStyle } from '@/lib/rtl'
import { MONO_STYLE } from '@/theme/typography'

/*
 * Auth kit. Built on the portals' green palette (`wk-*` tokens) so the first
 * screen people see matches the app they land in. Auth is always English +
 * LTR (see AuthLocaleGate), so nothing here mirrors for RTL.
 */

const MONO_TRACK = { letterSpacing: 1.1 }
const AnimatedPath = Animated.createAnimatedComponent(Path)

/* ─── Hero drawing ─────────────────────────────────────────────────────── */

type Pt = [number, number]

/** Straight-line strokes of a building frame + tower crane (viewBox 220×200). */
const STROKES: Pt[][] = [
  [
    [0, 186],
    [220, 186],
  ], // ground
  [
    [40, 186],
    [40, 70],
    [160, 70],
    [160, 186],
  ], // frame outline
  [
    [40, 110],
    [160, 110],
  ], // floor 2
  [
    [40, 150],
    [160, 150],
  ], // floor 1
  [
    [80, 70],
    [80, 186],
  ], // column
  [
    [120, 70],
    [120, 186],
  ], // column
  [
    [80, 150],
    [120, 110],
  ], // bracing
  [
    [120, 150],
    [80, 110],
  ], // bracing
  [
    [192, 186],
    [192, 18],
  ], // crane mast
  [
    [112, 18],
    [218, 18],
  ], // jib
  [
    [192, 18],
    [178, 4],
    [206, 4],
    [192, 18],
  ], // cab truss
  [
    [150, 18],
    [150, 52],
  ], // cable
]

function strokePath(points: Pt[]) {
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')
}

function strokeLength(points: Pt[]) {
  let total = 0
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
  }
  return total
}

function DrawnStroke({ points, index, color }: { points: Pt[]; index: number; color: string }) {
  const reduced = useReducedMotion()
  const length = strokeLength(points)
  const progress = useSharedValue(reduced ? 1 : 0)

  useEffect(() => {
    if (reduced) return
    progress.set(
      withDelay(
        150 + index * 110,
        withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
      ),
    )
  }, [index, progress, reduced])

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - progress.value),
  }))

  return (
    <AnimatedPath
      d={strokePath(points)}
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray={[length, length]}
      animatedProps={animatedProps}
    />
  )
}

/** Lime "survey point" hanging from the crane: a dot with a breathing ring. */
function PulseDot({ color, size = 10 }: { color: string; size?: number }) {
  const reduced = useReducedMotion()
  const pulse = useSharedValue(0)

  useEffect(() => {
    if (reduced) return
    pulse.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1))
  }, [pulse, reduced])

  const ring = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 2.2 }],
  }))

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        className="absolute inset-0 rounded-full"
        style={[{ backgroundColor: color }, ring]}
      />
      <View className="absolute inset-0 rounded-full" style={{ backgroundColor: color }} />
    </View>
  )
}

/* ─── Hero ─────────────────────────────────────────────────────────────── */

/**
 * Deep-green illustration band: blueprint grid, a building frame + crane that
 * draws itself in, and the brand lock-up. No copy — the form sits below it.
 */
export function AuthHero({ brand }: { brand: string }) {
  const { c } = useWkPalette()
  const insets = useSafeAreaInsets()
  const art = { width: 264, height: 240 }

  return (
    <View
      className="overflow-hidden rounded-b-[36px] bg-wk-hero"
      style={{ height: insets.top + 300 }}
      accessibilityRole="header"
      accessibilityLabel={brand}
    >
      {/* Blueprint grid, fading out toward the bottom. */}
      <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
        <Defs>
          <Pattern id="authGrid" width={24} height={24} patternUnits="userSpaceOnUse">
            <Path d="M24 0 L0 0 0 24" stroke={c.heroLine} strokeWidth={1} fill="none" />
          </Pattern>
          <LinearGradient id="authFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.2" stopColor={c.hero} stopOpacity={0} />
            <Stop offset="1" stopColor={c.hero} stopOpacity={0.9} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#authGrid)" />
        <Rect width="100%" height="100%" fill="url(#authFade)" />
      </Svg>

      {/* Lime glow behind the structure. */}
      <View
        pointerEvents="none"
        className="absolute self-center"
        style={{ width: 380, height: 380, bottom: -150 }}
      >
        <Svg width={380} height={380}>
          <Defs>
            <RadialGlow color={c.lime} />
          </Defs>
          <Rect width={380} height={380} fill="url(#authGlow)" />
        </Svg>
      </View>

      {/* Brand lock-up. */}
      <Animated.View
        entering={FadeIn.duration(500)}
        className="flex-row items-center gap-2.5 px-6"
        style={{ paddingTop: insets.top + 18 }}
      >
        <View className="size-9 items-center justify-center rounded-xl bg-wk-lime">
          <HardHat size={19} color={c.onLime} strokeWidth={2} />
        </View>
        <Text
          className="text-[12px] font-semibold uppercase text-wk-hero-ink"
          style={[MONO_STYLE, MONO_TRACK]}
        >
          {brand}
        </Text>
      </Animated.View>

      {/* The structure, centred on the band's floor. */}
      <View
        pointerEvents="none"
        className="absolute self-center"
        style={{ bottom: 6, width: art.width, height: art.height, opacity: 0.85 }}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Svg width={art.width} height={art.height} viewBox="0 0 220 200">
          {STROKES.map((points, index) => (
            <DrawnStroke key={index} points={points} index={index} color={c.lime} />
          ))}
        </Svg>
        {/* Load on the crane cable (viewBox 150,52 → scaled 1.2). */}
        <View className="absolute" style={{ left: 150 * 1.2 - 5, top: 52 * 1.2 - 2 }}>
          <PulseDot color={c.lime} />
        </View>
      </View>
    </View>
  )
}

function RadialGlow({ color }: { color: string }) {
  return (
    <RadialGradient id="authGlow" cx="50%" cy="50%" r="50%">
      <Stop offset="0" stopColor={color} stopOpacity={0.22} />
      <Stop offset="0.7" stopColor={color} stopOpacity={0} />
    </RadialGradient>
  )
}

/** Form area below the hero: flat on the page, no card. */
export function AuthBody({ children }: { children: ReactNode }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(480).delay(80).easing(Easing.out(Easing.cubic))}
      className="gap-6 px-5 pt-7"
    >
      {children}
    </Animated.View>
  )
}

/* ─── Mode switch ──────────────────────────────────────────────────────── */

/** Two-option segmented control with a sliding thumb. */
export function AuthSegmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  const [width, setWidth] = useState(0)
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  const x = useSharedValue(0)
  const segment = width / options.length

  useEffect(() => {
    x.set(withSpring(index * segment, { damping: 22, stiffness: 260, mass: 0.8 }))
  }, [index, segment, x])

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))

  return (
    <View
      className="h-[52px] flex-row rounded-2xl bg-wk-sf2 p-1"
      accessibilityRole="tablist"
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width - 8)}
    >
      {width > 0 ? (
        <Animated.View
          className="absolute bottom-1 left-1 top-1 rounded-xl border-[1.5px] border-wk-brand bg-wk-brand-soft"
          style={[{ width: segment }, thumb]}
        />
      ) : null}
      {options.map((option) => {
        const on = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(option.value)}
            className="flex-1 items-center justify-center"
          >
            <Text
              className={`text-[14px] ${on ? 'font-semibold text-wk-brand' : 'font-medium text-wk-ink3'}`}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/* ─── Fields ───────────────────────────────────────────────────────────── */

type AuthFieldProps = Omit<TextInputProps, 'className' | 'style'> & {
  label: string
  icon: LucideIcon
  error?: string
  /** Shows a green check at the end (e.g. a well-formed email). */
  valid?: boolean
  inputRef?: Ref<TextInputInstance>
}

/** Tall input with a leading icon, a soft focus ring and inline error. */
export function AuthField({ label, icon: Icon, error, valid, inputRef, ...input }: AuthFieldProps) {
  const { c } = useWkPalette()
  const [focused, setFocused] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const secret = Boolean(input.secureTextEntry)
  const tint = error ? c.red : focused ? c.brand : c.ink3
  const border = error ? 'border-wk-red' : focused ? 'border-wk-brand' : 'border-wk-line'

  return (
    <View className="gap-2">
      <Text className="text-[13px] font-medium text-wk-ink2">{label}</Text>
      <View
        className={`h-14 flex-row items-center gap-3 rounded-2xl border-[1.5px] bg-wk-sf ps-4 ${border} ${
          secret || valid ? 'pe-1' : 'pe-4'
        }`}
        style={focused ? { boxShadow: `0 0 0 4px ${error ? c.redSoft : c.brandSoft}` } : undefined}
      >
        <Icon size={19} color={tint} strokeWidth={1.9} />
        <TextInput
          {...input}
          ref={inputRef}
          secureTextEntry={secret && !revealed}
          accessibilityLabel={label}
          placeholderTextColor={c.ink3}
          className="h-full min-w-0 flex-1 text-[16px] text-wk-ink"
          style={ltrInputStyle({ forceLeft: true })}
          onFocus={(e) => {
            setFocused(true)
            input.onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            input.onBlur?.(e)
          }}
        />
        {secret ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            onPress={() => setRevealed((v) => !v)}
            className="size-12 items-center justify-center active:opacity-60"
          >
            {revealed ? (
              <EyeOff size={19} color={c.ink3} strokeWidth={1.9} />
            ) : (
              <Eye size={19} color={c.ink3} strokeWidth={1.9} />
            )}
          </Pressable>
        ) : valid ? (
          <Animated.View
            entering={ZoomIn.springify().damping(14)}
            className="me-3 size-6 items-center justify-center rounded-full bg-wk-brand"
          >
            <Check size={14} color={c.onBrand} strokeWidth={3} />
          </Animated.View>
        ) : null}
      </View>
      {error ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          className="flex-row items-center gap-1.5"
          accessibilityLiveRegion="polite"
        >
          <CircleAlert size={14} color={c.red} strokeWidth={2} />
          <Text className="min-w-0 flex-1 text-[13px] text-wk-red">{error}</Text>
        </Animated.View>
      ) : null}
    </View>
  )
}

/* ─── Password checklist ───────────────────────────────────────────────── */

export type PasswordRule = { label: string; met: boolean }

/** Three-segment strength bar + live rule chips (rules mirror password.schema). */
export function PasswordChecklist({ rules }: { rules: PasswordRule[] }) {
  const { c } = useWkPalette()
  const met = rules.filter((r) => r.met).length
  const barColor = met === rules.length ? 'bg-wk-brand' : met >= 2 ? 'bg-wk-amber' : 'bg-wk-red'

  return (
    <Animated.View entering={FadeIn.duration(240)} className="gap-2.5">
      <View className="flex-row gap-1.5">
        {rules.map((rule, i) => (
          <View
            key={rule.label}
            className={`h-1 flex-1 rounded-full ${i < met ? barColor : 'bg-wk-line'}`}
          />
        ))}
      </View>
      <View className="flex-row flex-wrap gap-2">
        {rules.map((rule) => (
          <View
            key={rule.label}
            className={`h-7 flex-row items-center gap-1.5 rounded-full px-2.5 ${
              rule.met ? 'bg-wk-brand-soft' : 'bg-wk-sf2'
            }`}
            accessibilityLabel={`${rule.label}: ${rule.met ? 'done' : 'missing'}`}
          >
            {rule.met ? (
              <Check size={12} color={c.brand} strokeWidth={3} />
            ) : (
              <View className="size-1.5 rounded-full bg-wk-ink3" />
            )}
            <Text
              className={`text-[12px] font-medium ${rule.met ? 'text-wk-brand' : 'text-wk-ink2'}`}
            >
              {rule.label}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  )
}

/* ─── Role tile ────────────────────────────────────────────────────────── */

/** Compact radio tile: icon over a short label. Three sit in a row. */
export function RoleTile({
  icon: Icon,
  label,
  selected,
  onPress,
}: {
  icon: LucideIcon
  label: string
  selected: boolean
  onPress: () => void
}) {
  const { c } = useWkPalette()
  return (
    <View className="min-w-0 flex-1">
      <PressScale
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
      >
        <View
          className={`min-h-[104px] items-center justify-center gap-3 rounded-2xl border-[1.5px] px-1.5 py-5 ${
            selected ? 'border-wk-brand bg-wk-brand-soft' : 'border-wk-sf2 bg-wk-sf2'
          }`}
        >
          <Icon size={22} color={selected ? c.brand : c.ink2} strokeWidth={1.9} />
          <Text
            className={`text-center text-[13px] font-semibold ${
              selected ? 'text-wk-brand' : 'text-wk-ink2'
            }`}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {label}
          </Text>
        </View>
      </PressScale>
    </View>
  )
}

/* ─── Buttons ──────────────────────────────────────────────────────────── */

/** Springs down slightly while pressed. */
export function PressScale({
  children,
  onPress,
  disabled,
  ...a11y
}: {
  children: ReactNode
  onPress: () => void
  disabled?: boolean
  accessibilityRole?: 'button' | 'radio' | 'link'
  accessibilityState?: { selected?: boolean; disabled?: boolean; busy?: boolean }
  accessibilityLabel?: string
  testID?: string
}) {
  const scale = useSharedValue(1)
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  return (
    <RNPressable
      {...a11y}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        scale.set(withSpring(0.975, { damping: 20, stiffness: 400 }))
      }}
      onPressOut={() => {
        scale.set(withSpring(1, { damping: 16, stiffness: 300 }))
      }}
    >
      <Animated.View style={style}>{children}</Animated.View>
    </RNPressable>
  )
}

/** Full-width primary action with a trailing arrow. */
export function AuthButton({
  label,
  onPress,
  loading,
  variant = 'brand',
  arrow = true,
  testID,
}: {
  label: string
  onPress: () => void
  loading?: boolean
  variant?: 'brand' | 'soft'
  arrow?: boolean
  testID?: string
}) {
  const { c } = useWkPalette()
  const fg = variant === 'brand' ? c.onBrand : c.ink
  return (
    <PressScale
      testID={testID}
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: Boolean(loading), disabled: Boolean(loading) }}
    >
      <View
        className={`h-14 flex-row items-center justify-center gap-2.5 rounded-2xl px-5 ${
          variant === 'brand' ? 'bg-wk-brand' : 'bg-wk-sf2'
        } ${loading ? 'opacity-80' : ''}`}
      >
        {loading ? <ActivityIndicator size="small" color={fg} /> : null}
        <Text
          className={`text-[16px] font-semibold ${
            variant === 'brand' ? 'text-wk-on-brand' : 'text-wk-ink'
          }`}
        >
          {label}
        </Text>
        {arrow && !loading ? <ArrowRight size={18} color={fg} strokeWidth={2.2} /> : null}
      </View>
    </PressScale>
  )
}

/* ─── Timeline ─────────────────────────────────────────────────────────── */

export type TimelineStep = {
  title: string
  subtitle: string
  state: 'done' | 'active' | 'upcoming'
}

/** Vertical status timeline: done (green check), active (pulsing amber), upcoming. */
export function AuthTimeline({ steps, liveLabel }: { steps: TimelineStep[]; liveLabel: string }) {
  const { c } = useWkPalette()
  return (
    <View>
      {steps.map((step, i) => {
        const last = i === steps.length - 1
        return (
          <Animated.View
            key={step.title}
            entering={FadeInDown.duration(380).delay(200 + i * 120)}
            className="flex-row gap-3.5"
          >
            <View className="items-center" style={{ width: 28 }}>
              {step.state === 'done' ? (
                <View className="size-7 items-center justify-center rounded-full bg-wk-brand">
                  <Check size={15} color={c.onBrand} strokeWidth={3} />
                </View>
              ) : step.state === 'active' ? (
                <View className="size-7 items-center justify-center rounded-full bg-wk-amber-soft">
                  <PulseDot color={c.amber} size={10} />
                </View>
              ) : (
                <View className="size-7 rounded-full border-2 border-wk-line2" />
              )}
              {last ? null : (
                <View
                  className={`my-1 w-0.5 flex-1 rounded-full ${
                    step.state === 'done' ? 'bg-wk-brand' : 'bg-wk-line'
                  }`}
                  style={{ minHeight: 22 }}
                />
              )}
            </View>
            <View
              className={`min-w-0 flex-1 gap-0.5 ${last ? '' : 'pb-5'}`}
              style={{ paddingTop: 3 }}
            >
              <View className="flex-row flex-wrap items-center gap-2">
                <Text
                  className={`text-[15px] font-semibold ${
                    step.state === 'upcoming' ? 'text-wk-ink3' : 'text-wk-ink'
                  }`}
                >
                  {step.title}
                </Text>
                {step.state === 'active' ? (
                  <View className="h-5 justify-center rounded-full bg-wk-amber-soft px-2">
                    <Text className="text-[11px] font-semibold text-wk-amber">{liveLabel}</Text>
                  </View>
                ) : null}
              </View>
              <Text className="text-[13px] leading-[18px] text-wk-ink2">{step.subtitle}</Text>
            </View>
          </Animated.View>
        )
      })}
    </View>
  )
}
