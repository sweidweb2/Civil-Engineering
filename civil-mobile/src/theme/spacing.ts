/**
 * spacing.ts — 4px base. Allowed steps: 2 4 6 8 10 12 14 16 20 24 28 32 36 40 48 60.
 * Semantic layout values mirror the design system (section 5.1).
 */

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  /** Horizontal screen padding. */
  screenX: 20,
  /** Gap between major sections. */
  section: 28,
  /** Gap inside a hero group. */
  group: 14,
  /** Gap between a section header and its content. */
  stack: 12,
  /** Distance from the top safe-area edge to the first content. */
  top: 16,
} as const

export type SpacingToken = keyof typeof spacing

/** Motion tokens (ms + easing control points for `Easing.bezier`). */
export const motion = {
  fast: 140,
  base: 220,
  slow: 380,
  standard: [0.2, 0, 0, 1] as const,
} as const
