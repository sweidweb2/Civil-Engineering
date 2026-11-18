/**
 * typography.ts — the type scale (design system section 4.2).
 *
 * `type` holds the numeric spec (for style props). `TYPE` holds the matching
 * Tailwind class strings (sizes come from the `--text-*` theme in global.css),
 * so components can write `className={TYPE.caption}`.
 *
 * Only three weights: 400, 500, 600. Sentence case everywhere; only the
 * eyebrow is uppercase. Numbers always use tabular figures.
 */

export const fontFamily = {
  sans: undefined as string | undefined, // platform UI font
  mono: 'monospace',
} as const

export const type = {
  display: { fontSize: 56, lineHeight: 56, fontWeight: '600', letterSpacing: -1.96 },
  displaySub: { fontSize: 26, lineHeight: 26, fontWeight: '500', letterSpacing: -0.52 },
  headline: { fontSize: 36, lineHeight: 40, fontWeight: '500', letterSpacing: -0.9 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '600', letterSpacing: -0.2 },
  section: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodySm: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  micro: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  tab: { fontSize: 11, lineHeight: 14, fontWeight: '500' },
  eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0.96 },
} as const

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

/** Tabular figures for every number. */
export const NUM_STYLE = { fontVariant: ['tabular-nums' as const] }

/** Monospace + tabular figures: amounts in rows, codes, eyebrows, chart labels. */
export const MONO_STYLE = { fontFamily: fontFamily.mono, fontVariant: ['tabular-nums' as const] }

/** Back-compat export (older imports used `typography`). */
export const typography = { fontFamily, type } as const
