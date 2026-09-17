/**
 * radius.ts — border-radius system.
 *
 * Prepare:
 * - none
 * - sm
 * - md
 * - lg
 * - xl
 * - full
 *
 * So components don't randomly use 7px, 13px, 18px, etc.
 * Pick tokens that match your visual language and reuse them.
 */

export const radius = {
  // none: 0,
  // sm: 4,
  // md: 8,
  // lg: 12,
  // xl: 16,
  // full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;
