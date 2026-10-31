/**
 * colors.ts — semantic palette.
 * 60-30-10:
 *   60% dominant — canvas (`background`)
 *   30% secondary — surfaces (`surface` / card, muted fills)
 *   10% accent — brand (`primary`) on CTAs, active nav, key highlights
 * Themes (next-themes): `light` | `colorful` | `dark`
 *   - light: white sidebar surface
 *   - colorful: same as light + green brand sidebar
 *   - dark: dark canvas / surfaces
 * Mint (`chartMint`) is chart-only — not a layout fill.
 * Wired into:
 * - web: `civil-web/src/index.css` (:root / .dark)
 * - mobile: `civil-mobile/global.css` (Uniwind light theme)
 */

export const colors = {
  light: {
    primary: '#287A74',
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
    /** @deprecated use `chartMint` — kept for older imports */
    secondary: '#6FCF97',
  },
  dark: {
    primary: '#287A74',
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
    /** @deprecated use `chartMint` */
    secondary: '#6FCF97',
  },
} as const

export type ColorToken = keyof typeof colors.light
