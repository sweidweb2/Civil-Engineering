/**
 * sizes.ts — control and layout dimensions (px). Touch targets ≥ 44.
 */

export const sizes = {
  touch: 44,
  iconButton: 44,
  quickAction: 52,
  buttonHeight: 54,
  textButtonHeight: 44,
  inputHeight: 52,
  listRow: 60,
  avatar: 44,
  avatarLg: 64,
  leading: 40,
  iconSm: 18,
  icon: 20,
  iconTab: 22,
  iconStroke: 1.75,
  iconStrokeActive: 1.9,
  progress: 8,
  segmentGap: 3,
  dot: 7,
  heroSkeletonW: 160,
  heroSkeletonH: 48,
  hitSlop: 8,
  maxContentWidth: 720,
} as const

export type SizeToken = keyof typeof sizes
