/**
 * colors.ts — semantic palette for light mode (shared with web).
 * 60-30-10: canvas 60 / surfaces 30 / primary accent 10.
 * Source of truth for brand tokens. Wired into `civil-mobile/global.css`
 * (Uniwind light theme RGB channels). Dark palette mirrors the dark vars in global.css.
 */

export const colors = {
  light: {
    primary: '#287A74',
    onPrimary: '#FFFFFF',
    background: '#EEEEEE',
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
    primary: '#4DB6AC',
    onPrimary: '#0A1412',
    background: '#0F1715',
    surface: '#17211F',
    muted: '#1F2C29',
    text: '#E6EFEC',
    textMuted: '#9BB0AB',
    border: '#2A3A37',
    chartMint: '#6FCF97',
    success: '#34B885',
    warning: '#F59E0B',
    error: '#F87171',
    info: '#60A5FA',
    disabled: '#6B7280',
    /** @deprecated use `chartMint` */
    secondary: '#6FCF97',
  },
} as const

export type ColorToken = keyof typeof colors.light
export type ColorPalette = { [K in ColorToken]: string }
