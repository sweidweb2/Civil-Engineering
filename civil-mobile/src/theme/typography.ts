/**
 * typography.ts — type ramp + semantic text styles (mobile).
 * Uses system UI fonts for native feel.
 */

const fontFamily = {
  sans: 'System',
  display: 'System',
  mono: 'monospace',
} as const

const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 34,
} as const

const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
}

const lineHeight = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.65,
} as const

const letterSpacing = {
  tight: -0.3,
  normal: 0,
  wide: 0.3,
} as const

export const typography = {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  styles: {
    heading1: {
      fontFamily: fontFamily.display,
      fontSize: fontSize['4xl'],
      fontWeight: fontWeight.bold,
      lineHeight: Math.round(fontSize['4xl'] * lineHeight.tight),
      letterSpacing: letterSpacing.tight,
    },
    heading2: {
      fontFamily: fontFamily.display,
      fontSize: fontSize['3xl'],
      fontWeight: fontWeight.semibold,
      lineHeight: Math.round(fontSize['3xl'] * lineHeight.tight),
      letterSpacing: letterSpacing.tight,
    },
    heading3: {
      fontFamily: fontFamily.display,
      fontSize: fontSize['2xl'],
      fontWeight: fontWeight.semibold,
      lineHeight: Math.round(fontSize['2xl'] * lineHeight.tight),
      letterSpacing: letterSpacing.normal,
    },
    body: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.md,
      fontWeight: fontWeight.regular,
      lineHeight: Math.round(fontSize.md * lineHeight.normal),
      letterSpacing: letterSpacing.normal,
    },
    bodySmall: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.regular,
      lineHeight: Math.round(fontSize.sm * lineHeight.normal),
      letterSpacing: letterSpacing.normal,
    },
    caption: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.regular,
      lineHeight: Math.round(fontSize.xs * lineHeight.normal),
      letterSpacing: letterSpacing.wide,
    },
    label: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      lineHeight: Math.round(fontSize.sm * lineHeight.tight),
      letterSpacing: letterSpacing.normal,
    },
    button: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      lineHeight: Math.round(fontSize.sm * lineHeight.tight),
      letterSpacing: letterSpacing.normal,
    },
  },
} as const

export type TypographyToken = keyof typeof typography
