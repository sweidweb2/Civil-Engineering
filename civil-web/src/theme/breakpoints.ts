/**
 * breakpoints.ts — responsive breakpoints (WEB ONLY).
 *
 * Conceptual tiers:
 * - mobile
 * - tablet
 * - desktop
 * - largeDesktop
 *
 * Common token names (map to px later):
 * - sm
 * - md
 * - lg
 * - xl
 *
 * Use these for media queries / layout switches so breakpoints
 * stay consistent across the web app.
 */

export const breakpoints = {
  // sm: 640,   // mobile → tablet
  // md: 768,   // tablet
  // lg: 1024,  // desktop
  // xl: 1280,  // largeDesktop
} as const;

export type BreakpointToken = keyof typeof breakpoints;
