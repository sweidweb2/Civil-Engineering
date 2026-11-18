/**
 * index.ts — single entry point for the mobile design tokens.
 * Colors, type, spacing, radius, sizes and motion. No shadows: depth comes
 * from tonal surfaces and 1px borders.
 */

import { colors } from './colors'
import { radius } from './radius'
import { sizes } from './sizes'
import { motion, spacing } from './spacing'
import { TYPE, type } from './typography'

export * from './colors'
export * from './radius'
export * from './sizes'
export * from './spacing'
export * from './typography'

export const theme = {
  colors,
  spacing,
  type,
  TYPE,
  radius,
  sizes,
  motion,
} as const

export type Theme = typeof theme
