/**
 * index.ts — single JS entry for the web theme.
 *
 * CSS classes: mirrored tokens live in `src/index.css` (runtime source for Tailwind).
 * Programmatic color (SVG fills, charts): import from here.
 *
 *   import { theme, colors, withAlpha, spacing } from '@/theme'
 */

export * from './breakpoints'
export * from './colors'
export * from './radius'
export * from './shadows'
export * from './sizes'
export * from './spacing'
export * from './typography'
export * from './zIndex'

import { breakpoints } from './breakpoints'
import { colors } from './colors'
import { radius } from './radius'
import { shadows } from './shadows'
import { sizes } from './sizes'
import { spacing } from './spacing'
import { typography } from './typography'
import { zIndex } from './zIndex'

export const theme = {
  colors,
  spacing,
  typography,
  radius,
  shadows,
  sizes,
  breakpoints,
  zIndex,
} as const

export type Theme = typeof theme
