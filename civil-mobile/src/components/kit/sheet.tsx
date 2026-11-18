import { type ReactNode, useCallback, useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'

import { Pressable } from '@/components/ui/pressable'
import { useThemeColors } from '@/hooks/useThemeColors'

const OPEN_MS = 300
const CLOSE_MS = 220
/** Drag further than this, or flick faster than DISMISS_VELOCITY, to dismiss. */
const DISMISS_DISTANCE = 110
const DISMISS_VELOCITY = 900

type BottomSheetProps = {
  visible: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Cap on the sheet height as a fraction of the screen. */
  maxHeightRatio?: number
}

/**
 * Bottom sheet with a drag-to-dismiss handle, a backdrop that fades with the
 * drag, and an exit animation. The pan lives on the handle + title only, so
 * lists inside the sheet keep scrolling normally.
 *
 * Motion: ease-out on enter, ease-in on exit, finger tracked 1:1, and the
 * release velocity decides between dismiss and snap-back.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  maxHeightRatio = 0.8,
}: BottomSheetProps) {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const { height: screenHeight } = useWindowDimensions()
  const [mounted, setMounted] = useState(visible)
  const translateY = useSharedValue(screenHeight)

  useEffect(() => {
    if (visible) {
      setMounted(true)
      translateY.set(withTiming(0, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) }))
    } else if (mounted) {
      translateY.set(
        withTiming(
          screenHeight,
          { duration: CLOSE_MS, easing: Easing.in(Easing.cubic) },
          (finished) => {
            if (finished) scheduleOnRN(setMounted, false)
          },
        ),
      )
    }
    // `mounted` is intentionally omitted: it only gates the exit branch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, screenHeight])

  const requestClose = useCallback(() => onClose(), [onClose])

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      translateY.set(Math.max(0, event.translationY))
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY) {
        scheduleOnRN(requestClose)
      } else {
        translateY.set(withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) }))
      }
    })

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }))
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, screenHeight * 0.6], [1, 0], 'clamp'),
  }))

  if (!mounted) return null

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView className="flex-1">
        <Animated.View className="absolute inset-0 bg-black/50" style={backdropStyle}>
          <Pressable accessibilityLabel={t('common.close')} className="flex-1" onPress={onClose} />
        </Animated.View>
        <KeyboardAvoidingView
          className="flex-1 justify-end"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
        >
          <Animated.View
            className="rounded-t-[32px] bg-card px-5"
            style={[
              {
                maxHeight: screenHeight * maxHeightRatio,
                paddingBottom: Math.max(insets.bottom, 16),
              },
              sheetStyle,
            ]}
          >
            <GestureDetector gesture={pan}>
              <View collapsable={false} className="pt-3">
                <View className="mb-3 h-1.5 w-10 self-center rounded-full bg-border" />
                {title ? (
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text
                      className="min-w-0 flex-1 text-lg font-bold text-foreground"
                      accessibilityRole="header"
                    >
                      {title}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('common.close')}
                      hitSlop={8}
                      className="size-9 items-center justify-center rounded-full bg-muted"
                      onPress={onClose}
                    >
                      <X size={18} color={colors.text} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </GestureDetector>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  )
}
