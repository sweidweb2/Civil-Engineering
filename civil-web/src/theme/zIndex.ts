/**
 * zIndex.ts — controlled stacking / layering (mainly WEB).
 *
 * Prepare named layers, e.g.:
 * - dropdown
 * - sticky
 * - modal
 * - popover
 * - toast
 * - tooltip
 *
 * Avoid ad-hoc values like z-index: 999999 everywhere.
 * Assign a clear order once and reuse the tokens.
 */

export const zIndex = {
  // dropdown: 1000,
  // sticky: 1100,
  // modal: 1300,
  // popover: 1400,
  // toast: 1500,
  // tooltip: 1600,
} as const;

export type ZIndexToken = keyof typeof zIndex;
