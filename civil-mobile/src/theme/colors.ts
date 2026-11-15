/**
 * colors.ts - brand palette. Source of truth, mirrored by the RGB variables in
 * `civil-mobile/global.css` (which drive every Tailwind class).
 *   primary   #15803D  actions, active states, the hero header (green)
 *   secondary #FF385C  coral accent; info stays teal #008489
 *   neutral   #FFFFFF  surfaces and text on color
 * Change a color here AND in global.css (light + dark blocks).
 */

export const colors = {
  light: {
    primary: '#15803D',
    onPrimary: '#FFFFFF',
    secondary: '#FF385C',
    background: '#F7F7F7',
    surface: '#FFFFFF',
    muted: '#F2F2F2',
    text: '#222222',
    textMuted: '#717171',
    border: '#DDDDDD',
    chartMint: '#0E9AA0',
    success: '#2F9E71',
    warning: '#D97706',
    error: '#C13515',
    info: '#008489',
    disabled: '#B0B0B0',
  },
  dark: {
    primary: '#22A55B',
    onPrimary: '#FFFFFF',
    secondary: '#FF4D6D',
    background: '#121212',
    surface: '#1C1C1E',
    muted: '#2A2A2C',
    text: '#F5F5F5',
    textMuted: '#A0A0A0',
    border: '#333336',
    chartMint: '#26A6AB',
    success: '#34B885',
    warning: '#F59E0B',
    error: '#FF7B5C',
    info: '#26A6AB',
    disabled: '#6B6B6B',
  },
} as const

export type ColorToken = keyof typeof colors.light
export type ColorPalette = { [K in ColorToken]: string }
