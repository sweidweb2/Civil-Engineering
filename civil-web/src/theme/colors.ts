/**
 * colors.ts — semantic palette (JS source of truth for programmatic color).
 *
 * Runtime CSS classes read the mirrored values in `civil-web/src/index.css`
 * (`:root` / `.dark` / `.home-canvas` / `@theme`). Keep both in sync.
 *
 * 60-30-10:
 *   60% dominant — canvas (`background`)
 *   30% secondary — surfaces (`surface` / card, muted fills)
 *   10% accent — brand (`primary`) on CTAs, active nav, key highlights
 * Themes (next-themes): `light` | `colorful` | `dark`
 * Mint (`chartMint`) is chart-only — not a layout fill.
 */

export const colors = {
  light: {
    primary: '#287A74',
    /** 3D bar top / soft brand gradient stop */
    primarySoft: '#3F9A93',
    /** 3D bar side / deep brand gradient stop */
    primaryDeep: '#1F5F5A',
    /** Darker brand gradient stop */
    primaryDark: '#245E59',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    muted: '#E8EEEC',
    text: '#1A2A27',
    textMuted: '#5A6B67',
    border: '#D5DEDC',
    chartMint: '#6FCF97',
    success: '#2F9E71',
    warning: '#D97706',
    error: '#DC2626',
    info: '#2563EB',
    disabled: '#9CA3AF',
    /** Warm canvases matched to illustration assets / marketing */
    homeCanvas: '#F8F3ED',
    illustrationCanvas: '#FEF8EF',
    listingCanvas: '#F4F1EB',
    providerHomeCanvas: '#F7FBF9',
    /** @deprecated use `chartMint` — kept for older imports */
    secondary: '#6FCF97',
  },
  dark: {
    primary: '#287A74',
    primarySoft: '#3F9A93',
    primaryDeep: '#1F5F5A',
    primaryDark: '#245E59',
    background: '#121916',
    surface: '#1C2421',
    muted: '#24302C',
    text: '#E8EEEC',
    textMuted: '#8A9A95',
    border: '#33403C',
    chartMint: '#6FCF97',
    success: '#2F9E71',
    warning: '#D97706',
    error: '#F87171',
    info: '#60A5FA',
    disabled: '#6B7280',
    homeCanvas: '#121916',
    illustrationCanvas: '#121916',
    listingCanvas: '#121916',
    providerHomeCanvas: '#121916',
    /** @deprecated use `chartMint` */
    secondary: '#6FCF97',
  },
} as const

export type ColorToken = keyof typeof colors.light

/** Hex `#RRGGBB` → `rgba(r, g, b, alpha)` for SVG / canvas fills. */
export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : normalized
  const value = Number.parseInt(full, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
