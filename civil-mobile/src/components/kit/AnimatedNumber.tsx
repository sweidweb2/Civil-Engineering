import { useEffect } from 'react'
import { Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

function DigitColumn({
  digit,
  className,
  fontSize,
  lineHeight,
}: {
  digit: number
  className: string
  fontSize: number
  lineHeight: number
}) {
  const reduceMotion = useReducedMotion()
  const position = useSharedValue(reduceMotion ? digit : 0)
  useEffect(() => {
    position.set(
      reduceMotion ? digit : withTiming(digit, { duration: 650, easing: Easing.out(Easing.cubic) }),
    )
  }, [digit, position, reduceMotion])
  const strip = useAnimatedStyle(() => ({
    transform: [{ translateY: -position.value * lineHeight }],
  }))
  return (
    <View style={{ height: lineHeight, overflow: 'hidden' }}>
      <Animated.View style={strip}>
        {DIGITS.map((d) => (
          <Text
            key={d}
            className={className}
            style={{ fontSize, lineHeight, fontVariant: ['tabular-nums'] }}
          >
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  )
}

/**
 * Rolling-digit number (NumberFlow-style). Digits roll up from 0 on first
 * render and roll to the new value on change; separators and placeholders
 * ("—", "…") render as plain text. Skips motion when reduced motion is on.
 */
export function AnimatedNumber({
  value,
  className,
  fontSize,
  lineHeight,
  numberOfLines,
}: {
  value: string
  /** Color / weight classes. Size is set through `fontSize` + `lineHeight`. */
  className: string
  fontSize: number
  lineHeight: number
  numberOfLines?: number
}) {
  const chars = Array.from(value)
  // Key by position from the end so each digit column keeps its identity as the
  // number grows (9 → 10) instead of remounting every column.
  return (
    <View
      accessible
      accessibilityLabel={value}
      // Numbers read left-to-right even inside an RTL layout.
      style={{ flexDirection: 'row', direction: 'ltr', alignSelf: 'flex-start' }}
    >
      {chars.map((char, index) => {
        const fromEnd = chars.length - index
        if (/^[0-9]$/.test(char)) {
          return (
            <DigitColumn
              key={`d${fromEnd}`}
              digit={Number(char)}
              className={className}
              fontSize={fontSize}
              lineHeight={lineHeight}
            />
          )
        }
        return (
          <Text
            key={`s${fromEnd}`}
            className={className}
            numberOfLines={numberOfLines}
            style={{ fontSize, lineHeight, fontVariant: ['tabular-nums'] }}
          >
            {char}
          </Text>
        )
      })}
    </View>
  )
}
