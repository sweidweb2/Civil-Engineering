/**
 * radius.ts — border-radius scale (px).
 * Base `lg` matches `--radius: 0.625rem` (10px) in `index.css`.
 */

export const radius = {
  none: 0,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  '2xl': 18,
  full: 9999,
} as const

export type RadiusToken = keyof typeof radius
