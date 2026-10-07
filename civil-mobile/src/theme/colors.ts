/**
 * colors.ts — semantic palette for light mode (shared with web).
 * 60-30-10: canvas 60 / surfaces 30 / primary accent 10.
 * Source of truth for brand tokens. Wired into `civil-mobile/global.css`
 * (Uniwind light theme RGB channels). Dark mode remains TBD.
 */

export const colors = {
  light: {
    primary: '#287A74',
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
  // dark: { … } — TBD
} as const

export type ColorToken = keyof typeof colors.light
