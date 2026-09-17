/**
 * sizes.ts — reusable global dimensions.
 *
 * Prepare only shared layout/control sizes, e.g.:
 * - header
 * - sidebar
 * - buttonHeight
 * - inputHeight
 * - icon (or iconSm / iconMd / iconLg)
 * - avatar
 * - maxContentWidth
 *
 * Do NOT put every component’s one-off size here.
 * Only global / reusable dimensions belong in this file.
 */

export const sizes = {
  // header: 64,
  // sidebar: 280,
  // buttonHeight: 40,
  // inputHeight: 40,
  // icon: 24,
  // avatar: 40,
  // maxContentWidth: 1200,
} as const;

export type SizeToken = keyof typeof sizes;
