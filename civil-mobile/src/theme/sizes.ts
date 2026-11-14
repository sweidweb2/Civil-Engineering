/**
 * sizes.ts — reusable layout / control dimensions (mobile, px).
 * Touch targets follow ~44pt minimum where practical.
 */

export const sizes = {
  header: 56,
  buttonHeight: 44,
  buttonHeightSm: 36,
  buttonHeightLg: 48,
  inputHeight: 44,
  iconSm: 16,
  icon: 24,
  iconLg: 28,
  avatarSm: 32,
  avatar: 40,
  avatarLg: 56,
  hitSlop: 8,
  tabBar: 56,
  maxContentWidth: 720,
} as const

export type SizeToken = keyof typeof sizes
