/**
 * colors.ts — semantic palette for light mode (shared with web).
 * Source of truth for brand tokens. Wired into `civil-mobile/global.css`
 * (Uniwind light theme RGB channels). Dark mode remains TBD.
 */

export const colors = {
  light: {
    primary: '#2FA084',
    secondary: '#6FCF97',
    background: '#EEEEEE',
    surface: '#FFFFFF',
    text: '#1A2A27',
    textMuted: '#5A6B67',
    border: '#D5DEDC',
    success: '#2F9E71',
    warning: '#D97706',
    error: '#DC2626',
    info: '#2563EB',
    disabled: '#9CA3AF',
  },
  // dark: { … } — TBD
} as const

export type ColorToken = keyof typeof colors.light
