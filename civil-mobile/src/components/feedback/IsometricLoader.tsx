import { useEffect } from 'react'
import { Text, View } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Polygon, Rect } from 'react-native-svg'

import { useThemeColors } from '@/hooks/useThemeColors'

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon)
const AnimatedRect = Animated.createAnimatedComponent(Rect)

type IsometricLoaderProps = {
  label?: string
  /** Illustration edge length in px (square). */
  size?: number
}

/**
 * Lightweight isometric warehouse loader.
 * Animation runs on the UI thread (Reanimated) — no JS timers, no bitmaps.
 */
export function IsometricLoader({ label = 'Loading…', size = 160 }: IsometricLoaderProps) {
  const t = useSharedValue(0)

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    )
  }, [t])

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(t.value, [0, 1], [0, -7]) },
      { scale: interpolate(t.value, [0, 1], [1, 1.03]) },
    ],
  }))

  const accentProps = useAnimatedProps(() => ({
    opacity: interpolate(t.value, [0, 1], [0.55, 1]),
  }))

  const shimmerProps = useAnimatedProps(() => ({
    opacity: interpolate(t.value, [0, 1], [0.12, 0.38]),
  }))

  const barProps = useAnimatedProps(() => ({
    width: interpolate(t.value, [0, 1], [18, 60]),
  }))

  const palette = useThemeColors()

  return (
    <View
      className="flex-1 items-center justify-center gap-4 px-6 py-16"
      accessibilityLabel={label}
      accessible
    >
      <Animated.View style={[{ width: size, height: size }, floatStyle]}>
        <Svg width={size} height={size} viewBox="0 0 160 160">
          {/* Ground shadow */}
          <Polygon points="80,132 118,114 80,96 42,114" fill={palette.text} opacity={0.06} />

          {/* Platform / slab */}
          <Polygon points="80,118 124,96 80,74 36,96" fill={palette.border} />
          <Polygon points="36,96 80,118 80,126 36,104" fill="#B8C5C2" />
          <Polygon points="80,118 124,96 124,104 80,126" fill="#9AADAA" />

          {/* Left crate */}
          <Polygon points="52,92 72,82 72,58 52,68" fill="#A8B8B5" />
          <Polygon points="72,82 92,92 92,68 72,58" fill="#8A9E9A" />
          <Polygon points="52,68 72,58 92,68 72,78" fill="#C5D2CF" />

          {/* Right crate (brand accent) */}
          <AnimatedPolygon
            animatedProps={accentProps}
            points="88,86 112,74 112,48 88,60"
            fill={palette.primary}
          />
          <Polygon points="112,74 132,86 132,60 112,48" fill="#1F5F5A" />
          <Polygon points="88,60 112,48 132,60 108,72" fill={palette.chartMint} opacity={0.9} />

          {/* Back shed */}
          <Polygon points="48,56 80,40 80,18 48,34" fill="#D5DEDC" />
          <Polygon points="80,40 112,56 112,34 80,18" fill="#BFCBC8" />
          <Polygon points="48,34 80,18 112,34 80,50" fill="#E8EEEC" />

          {/* Soft roof shimmer */}
          <AnimatedPolygon
            animatedProps={shimmerProps}
            points="56,36 80,24 104,36 80,48"
            fill="#FFFFFF"
          />

          {/* Progress track + growing fill */}
          <Rect x="50" y="140" width="60" height="4" rx="2" fill={palette.muted} />
          <AnimatedRect
            animatedProps={barProps}
            x="50"
            y="140"
            height="4"
            rx="2"
            fill={palette.primary}
          />
        </Svg>
      </Animated.View>

      <Text className="text-sm text-muted-foreground">{label}</Text>
    </View>
  )
}
