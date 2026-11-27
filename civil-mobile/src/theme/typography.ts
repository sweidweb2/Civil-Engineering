/**
 * typography.ts — the type scale (design system section 4.2).
 *
 * `type` holds the numeric spec (for style props). `TYPE` holds the matching
 * Tailwind class strings (sizes come from the `--text-*` theme in global.css),
 * so components can write `className={TYPE.caption}`.
 *
 * Only three weights: 400, 500, 600. Sentence case everywhere; only the
 * eyebrow is uppercase. Numbers always use tabular figures.
 *
 * Arabic uses Noto Sans Arabic (loaded in root layout) with zero letter-spacing
 * and slightly taller line heights so diacritics are not clipped.
 */

import type { TextStyle } from 'react-native'

import { isRtlLayout } from '@/lib/rtl'

export const fontFamily = {
  sans: undefined as string | undefined, // platform UI font (English)
  arabic: {
    regular: 'NotoSansArabic_400Regular',
    medium: 'NotoSansArabic_500Medium',
    semibold: 'NotoSansArabic_600SemiBold',
  },
  mono: 'monospace',
} as const

export const type = {
  display: { fontSize: 56, lineHeight: 56, fontWeight: '600' as const, letterSpacing: -1.96 },
  displaySub: { fontSize: 26, lineHeight: 26, fontWeight: '500' as const, letterSpacing: -0.52 },
  headline: { fontSize: 36, lineHeight: 40, fontWeight: '500' as const, letterSpacing: -0.9 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '600' as const, letterSpacing: -0.2 },
  section: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '500' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodySm: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  micro: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  tab: { fontSize: 11, lineHeight: 14, fontWeight: '500' as const },
  eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const, letterSpacing: 0.96 },
} as const

const RTL_LINE_EXTRA: Partial<Record<keyof typeof type, number>> = {
  display: 4,
  displaySub: 4,
  headline: 4,
  title: 3,
  section: 2,
  bodyStrong: 2,
  body: 2,
  bodySm: 2,
  caption: 2,
  micro: 2,
  tab: 2,
  eyebrow: 2,
}

export type TypeToken = keyof typeof type

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
} as const satisfies Record<TypeToken, string>

function arabicFamilyForWeight(weight: TextStyle['fontWeight']): string {
  const n = typeof weight === 'string' ? Number.parseInt(weight, 10) : weight
  if (n != null && n >= 600) return fontFamily.arabic.semibold
  if (n != null && n >= 500) return fontFamily.arabic.medium
  return fontFamily.arabic.regular
}

/**
 * Sans font + RTL type tweaks for style props. Prefer on Text/TextInput that
 * already use `TYPE.*` classes when Arabic is active.
 */
export function sansStyle(weight: TextStyle['fontWeight'] = '400'): TextStyle | undefined {
  if (!isRtlLayout()) return undefined
  return { fontFamily: arabicFamilyForWeight(weight) }
}

/** Numeric type token adjusted for the active layout direction. */
export function typeStyle(token: TypeToken): TextStyle {
  const base = type[token]
  const rtl = isRtlLayout()
  const extra = rtl ? (RTL_LINE_EXTRA[token] ?? 0) : 0
  return {
    fontSize: base.fontSize,
    lineHeight: base.lineHeight + extra,
    fontWeight: base.fontWeight,
    letterSpacing: rtl ? 0 : 'letterSpacing' in base ? base.letterSpacing : undefined,
    ...(rtl ? { fontFamily: arabicFamilyForWeight(base.fontWeight) } : null),
  }
}

/** Default Text style applied at the root when Arabic is active. */
export function arabicDefaultTextStyle(): TextStyle {
  return { fontFamily: fontFamily.arabic.regular }
}

/** Monospace + tabular figures: amounts in rows, codes, eyebrows, chart labels. */
export const MONO_STYLE = { fontFamily: fontFamily.mono, fontVariant: ['tabular-nums' as const] }
