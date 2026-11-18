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
import { radius } from '@/theme/radius'
import { sizes } from '@/theme/sizes'
import { motion } from '@/theme/spacing'
import { TYPE } from '@/theme/typography'

const OPEN_MS = motion.base + 40
const CLOSE_MS = motion.base
const EASE = Easing.bezier(...motion.standard)
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
      translateY.set(withTiming(0, { duration: OPEN_MS, easing: EASE }))
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
        translateY.set(withTiming(0, { duration: motion.base, easing: EASE }))
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
        <Animated.View className="absolute inset-0 bg-black/40" style={backdropStyle}>
          <Pressable accessibilityLabel={t('common.close')} className="flex-1" onPress={onClose} />
        </Animated.View>
        <KeyboardAvoidingView
          className="flex-1 justify-end"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
        >
          <Animated.View
            className="bg-card px-5"
            style={[
              {
                maxHeight: screenHeight * maxHeightRatio,
                borderTopLeftRadius: radius.sheet,
                borderTopRightRadius: radius.sheet,
                paddingBottom: Math.max(insets.bottom, 16),
              },
              sheetStyle,
            ]}
          >
            <GestureDetector gesture={pan}>
              <View collapsable={false} className="pt-2">
                <View className="mb-4 h-1 w-9 self-center rounded-full bg-border" />
                {title ? (
                  <View className="mb-4 flex-row items-center justify-between gap-3">
                    <Text
                      className={`${TYPE.title} min-w-0 flex-1 text-foreground`}
                      accessibilityRole="header"
                    >
                      {title}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('common.close')}
                      className="items-center justify-center rounded-full border border-border bg-card active:bg-background"
                      style={{ width: sizes.iconButton, height: sizes.iconButton }}
                      onPress={onClose}
                    >
                      <X size={sizes.iconSm} color={colors.ink} strokeWidth={sizes.iconStroke} />
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
