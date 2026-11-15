import type { ViewStyle } from 'react-native'

/**
 * shadows.ts — RN elevation ladder (iOS shadow* + Android elevation).
 */

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } satisfies ViewStyle,
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  } satisfies ViewStyle,
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  } satisfies ViewStyle,
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  } satisfies ViewStyle,
  xl: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 10,
  } satisfies ViewStyle,
} as const

export type ShadowToken = keyof typeof shadows

/**
 * Soft, tinted elevation (mobile-ui skill: never pure grey/black shadows).
 * `card` is the resting surface, `float` is for the tab bar / FAB, and
 * `glow(color)` is a colored halo for primary actions.
 */
export const softShadows = {
  card: {
    shadowColor: '#3B2A4A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 2,
  } satisfies ViewStyle,
  float: {
    shadowColor: '#3B2A4A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 10,
  } satisfies ViewStyle,
} as const

export function glow(color: string, strength = 0.35): ViewStyle {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: strength,
    shadowRadius: 16,
    elevation: 8,
  }
}
