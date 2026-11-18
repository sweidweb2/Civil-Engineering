/**
 * colors.ts - design-system color roles for props that cannot take a
 * className (icon colors, RefreshControl tints, SVG fills). Mirrors the RGB
 * variables in `civil-mobile/global.css`. Change both together.
 *
 * Near-monochrome: warm neutrals + ink. `accent` (the brand green) is the
 * only accent and is reserved for meaning. Legacy keys (primary, text,
 * textMuted, error…) alias the roles so older call sites keep resolving.
 */

const light = {
  bg: '#F6F5F1',
  surface: '#FFFFFF',
  surface2: '#F6F5F1',
  surfaceInverse: '#15171A',
  line: '#E4E2DC',
  lineSubtle: '#EEECE7',
  lineStrong: '#D1CEC6',
  ink: '#15171A',
  ink2: '#3A3D42',
  muted: '#5E6168',
  muted2: '#6B6E75',
  deEmphasis: '#8A8D93',
  data2: '#5A5E66',
  data3: '#A3A6AC',
  accent: '#15803D',
  onAccent: '#FFFFFF',
  onInverse: '#F6F5F1',
  onInverseMuted: '#A9ACB2',
  /** Accent readable on `surfaceInverse` (toast actions). */
  accentOnInverse: '#6CCF8E',
  negative: '#B4441E',
  warning: '#9A6200',
  scrim: 'rgba(0,0,0,0.4)',
}

const dark: typeof light = {
  bg: '#111315',
  surface: '#1A1D20',
  surface2: '#1E2124',
  surfaceInverse: '#F2F1EC',
  line: '#2A2E33',
  lineSubtle: '#22262A',
  lineStrong: '#3A3F45',
  ink: '#F2F1EC',
  ink2: '#D6D5D0',
  muted: '#9A9EA6',
  muted2: '#8C9098',
  deEmphasis: '#70747B',
  data2: '#A0A4AA',
  data3: '#60656C',
  accent: '#6CCF8E',
  onAccent: '#0A1F12',
  onInverse: '#111315',
  onInverseMuted: '#52565D',
  accentOnInverse: '#15803D',
  negative: '#F0A46B',
  warning: '#E6B65C',
  scrim: 'rgba(0,0,0,0.4)',
}

function withAliases<P extends typeof light>(p: P) {
  return {
    ...p,
    primary: p.accent,
    onPrimary: p.onAccent,
    secondary: p.ink,
    background: p.bg,
    text: p.ink,
    textMuted: p.muted,
    border: p.line,
    chartMint: p.data2,
    success: p.accent,
    error: p.negative,
    info: p.data2,
    disabled: p.deEmphasis,
  }
}

export const colors = {
  light: withAliases(light),
  dark: withAliases(dark),
} as const

export type ColorToken = keyof typeof colors.light
export type ColorPalette = { [K in ColorToken]: string }
