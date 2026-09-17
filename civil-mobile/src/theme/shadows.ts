/**
 * shadows.ts — elevation / shadow system (RN: shadow* props + Android elevation).
 *
 * Prepare:
 * - none
 * - sm
 * - md
 * - lg
 * - xl
 *
 * Useful for cards, sheets, modals, floating actions, etc.
 * Keep a small ladder; don't invent a new shadow per screen.
 * Platform differences (iOS shadow vs Android elevation) can live
 * inside each token object later.
 */

export const shadows = {
  // none: {},
  // sm: {},
  // md: {},
  // lg: {},
  // xl: {},
} as const;

export type ShadowToken = keyof typeof shadows;
