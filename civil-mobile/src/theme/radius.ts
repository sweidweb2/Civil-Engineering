/**
 * radius.ts — corner radius tokens (px). Mirrors `--radius-*` in global.css.
 * Nested shapes: inner radius = outer radius − padding.
 */

export const radius = {
  none: 0,
  xs: 2,
  sm: 6,
  md: 14,
  lg: 16,
  xl: 20,
  sheet: 24,
  full: 9999,
} as const

export type RadiusToken = keyof typeof radius
