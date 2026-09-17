/**
 * shadows.ts — elevation / shadow system (web: CSS box-shadow).
 *
 * Prepare:
 * - none
 * - sm
 * - md
 * - lg
 * - xl
 *
 * Useful for cards, dropdowns, modals, floating panels, etc.
 * Keep a small ladder; don't invent a new shadow per component.
 */

export const shadows = {
  // none: 'none',
  // sm: '',
  // md: '',
  // lg: '',
  // xl: '',
} as const;

export type ShadowToken = keyof typeof shadows;
