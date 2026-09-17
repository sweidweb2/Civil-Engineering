/**
 * spacing.ts — shared spacing scale.
 *
 * Avoid one-off values like margin: 13px, padding: 27px, gap: 19px.
 * Define a system and use it everywhere:
 * - xs
 * - sm
 * - md
 * - lg
 * - xl
 * - 2xl
 * - 3xl
 * - … (extend only when the scale needs a new step)
 *
 * Prefer a consistent base unit (e.g. 4px) so spacing stays predictable.
 */

export const spacing = {
  // xs: 4,
  // sm: 8,
  // md: 16,
  // lg: 24,
  // xl: 32,
  // '2xl': 48,
  // '3xl': 64,
} as const;

export type SpacingToken = keyof typeof spacing;
