import { useIsDark } from '@/hooks/useThemeColors'

/**
 * Worker-portal palette (resources/workers/Workers Portal.dc.html).
 *
 * Scoped to the worker portal only: green brand on warm off-white, a deep
 * green hero card with lime highlights, soft tinted pills. Mirrors the
 * `--wk-*` variables in `civil-mobile/global.css` (use `bg-wk-*` /
 * `text-wk-*` classes there); this object is for props that cannot take a
 * className (icon colors, SVG strokes, placeholder colors). Change both together.
 *
 * Translucent values in the design (lines, soft tints, hero mutes) are
 * pre-composited onto their usual surface so they stay opaque tokens.
 */
const light = {
  bg: '#F4F3EF',
  sf: '#FFFFFF',
  sf2: '#F0EFEA',
  ink: '#141614',
  ink2: '#545853',
  ink3: '#8A8D87',
  line: '#ECECEC',
  line2: '#D9DAD9',
  brand: '#15803D',
  brandSoft: '#E3F1E7',
  onBrand: '#FFFFFF',
  hero: '#0F2419',
  heroInk: '#EEF3EC',
  heroMute: '#A2ADA4',
  heroLine: '#2A3D32',
  heroField: '#1D3127',
  lime: '#86E3A6',
  onLime: '#0A1F12',
  amber: '#9A5806',
  amberSoft: '#F9EEDA',
  red: '#B42318',
  redSoft: '#FBE8E6',
  teal: '#0E6F86',
  tealSoft: '#E0F0F4',
  tab: '#1A1C1A',
  tabInk: '#F4F3EF',
  scrim: 'rgba(10,12,10,0.42)',
}

const dark: typeof light = {
  bg: '#0B0D0B',
  sf: '#151815',
  sf2: '#1E221E',
  ink: '#ECEFEA',
  ink2: '#A9AEA6',
  ink3: '#737870',
  line: '#252825',
  line2: '#3A3D3A',
  brand: '#2BB062',
  brandSoft: '#182F21',
  onBrand: '#04110A',
  hero: '#123020',
  heroInk: '#EEF3EC',
  heroMute: '#A3B1A7',
  heroLine: '#2C4738',
  heroField: '#203C2D',
  lime: '#86E3A6',
  onLime: '#0A1F12',
  amber: '#EBA748',
  amberSoft: '#312B1C',
  red: '#F27A68',
  redSoft: '#322520',
  teal: '#5BC7DF',
  tealSoft: '#1E2F2F',
  tab: '#E1E4DF',
  tabInk: '#0B0D0B',
  scrim: 'rgba(0,0,0,0.6)',
}

export type WorkerPalette = typeof light

/** Soft card elevation from the design. Dark mode swaps it for a hairline ring. */
const SHADOW = {
  light: { boxShadow: '0 1px 2px rgba(20,22,20,0.04), 0 10px 28px -8px rgba(20,22,20,0.08)' },
  dark: { boxShadow: '0 0 0 1px rgba(255,255,255,0.04)' },
} as const

/** Floating elements (tab bar, FAB, toast) cast a deeper shadow. */
const FLOAT = { boxShadow: '0 16px 40px -12px rgba(0,0,0,0.45)' } as const

export function useWorkerPalette() {
  const isDark = useIsDark()
  return {
    c: isDark ? dark : light,
    shadow: isDark ? SHADOW.dark : SHADOW.light,
    float: FLOAT,
    isDark,
  }
}

/** Pill / tile tones. Literal class strings so Tailwind sees them. */
export type WkTone = 'green' | 'amber' | 'red' | 'teal' | 'neutral'

export const WK_TONE_BG: Record<WkTone, string> = {
  green: 'bg-wk-brand-soft',
  amber: 'bg-wk-amber-soft',
  red: 'bg-wk-red-soft',
  teal: 'bg-wk-teal-soft',
  neutral: 'bg-wk-sf2',
}

export const WK_TONE_TEXT: Record<WkTone, string> = {
  green: 'text-wk-brand',
  amber: 'text-wk-amber',
  red: 'text-wk-red',
  teal: 'text-wk-teal',
  neutral: 'text-wk-ink2',
}

export const WK_TONE_DOT: Record<WkTone, string> = {
  green: 'bg-wk-brand',
  amber: 'bg-wk-amber',
  red: 'bg-wk-red',
  teal: 'bg-wk-teal',
  neutral: 'bg-wk-ink2',
}

/** Room the floating tab bar needs below a top-level screen's content. */
export const WK_TAB_SPACE = 112
