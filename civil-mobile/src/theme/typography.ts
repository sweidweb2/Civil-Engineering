/**
 * typography.ts — the type scale (design system section 4.2).
 *
 * `TYPE` holds the Tailwind class strings per token (sizes come from the
 * `--text-*` theme in global.css), so components can write `className={TYPE.caption}`.
 *
 * Only three weights: 400, 500, 600. Sentence case everywhere; only the
 * eyebrow is uppercase. Numbers always use tabular figures.
 *
 * Arabic uses Noto Sans Arabic (loaded in root layout) with zero letter-spacing
 * and slightly taller line heights so diacritics are not clipped.
 */

import type { TextStyle } from 'react-native'

export const fontFamily = {
  sans: undefined as string | undefined, // platform UI font (English)
  arabic: {
    regular: 'NotoSansArabic_400Regular',
    medium: 'NotoSansArabic_500Medium',
    semibold: 'NotoSansArabic_600SemiBold',
  },
  mono: 'monospace',
} as const

/** Tailwind class strings per type token (color is added by the caller). */
export const TYPE = {
  display: 'text-4xl font-semibold',
  displaySub: 'text-2xl font-medium',
  headline: 'text-3xl font-medium',
  title: 'text-xl font-semibold',
  section: 'text-lg font-semibold',
  bodyStrong: 'text-base font-medium',
  body: 'text-base font-normal',
  bodySm: 'text-sm font-normal',
  caption: 'text-caption font-normal',
  micro: 'text-xs font-normal',
  tab: 'text-tab font-medium',
  eyebrow: 'text-xs font-normal uppercase',
} as const

export type TypeToken = keyof typeof TYPE

/** Default Text style applied at the root when Arabic is active. */
export function arabicDefaultTextStyle(): TextStyle {
  return { fontFamily: fontFamily.arabic.regular }
}

/** Monospace + tabular figures: amounts in rows, codes, eyebrows, chart labels. */
export const MONO_STYLE = { fontFamily: fontFamily.mono, fontVariant: ['tabular-nums' as const] }
