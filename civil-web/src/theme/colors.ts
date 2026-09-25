/**
 * colors.ts — semantic palette.
 * 90-60-30: canvas (90) / surfaces (60) / accent (30).
 * Wired into:
 * - web: `civil-web/src/index.css` (:root / .dark)
 * - mobile: `civil-mobile/global.css` (Uniwind light theme)
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
  dark: {
    primary: '#2FA084',
    secondary: '#6FCF97',
    background: '#121916',
    surface: '#1C2421',
    text: '#E8EEEC',
    textMuted: '#8A9A95',
    border: '#33403C',
    success: '#2F9E71',
    warning: '#D97706',
    error: '#F87171',
    info: '#60A5FA',
    disabled: '#6B7280',
  },
} as const

export type ColorToken = keyof typeof colors.light
