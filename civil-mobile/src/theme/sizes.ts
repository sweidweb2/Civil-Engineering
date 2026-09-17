/**
 * sizes.ts — reusable global dimensions.
 *
 * Prepare only shared layout/control sizes, e.g.:
 * - header
 * - buttonHeight
 * - inputHeight
 * - icon (or iconSm / iconMd / iconLg)
 * - avatar
 * - hitSlop / min tap target
 *
 * Do NOT put every component’s one-off size here.
 * Only global / reusable dimensions belong in this file.
 * (No sidebar / maxContentWidth required on mobile unless you reuse them.)
 */

export const sizes = {
  // header: 56,
  // buttonHeight: 44,
  // inputHeight: 44,
  // icon: 24,
  // avatar: 40,
  // hitSlop: 8,
} as const;

export type SizeToken = keyof typeof sizes;
