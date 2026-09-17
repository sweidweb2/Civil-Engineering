/**
 * typography.ts — typography system + semantic text styles.
 *
 * Core tokens to prepare:
 * - fontFamily
 * - fontSize
 * - fontWeight
 * - lineHeight
 * - letterSpacing
 *
 * Semantic styles (compose the tokens above):
 * - heading1
 * - heading2
 * - heading3
 * - body
 * - bodySmall
 * - caption
 * - label
 * - button
 *
 * Components should consume semantic styles first; reach for raw
 * fontSize/weight only when no semantic style fits.
 */

export const typography = {
  // fontFamily: {
  //   sans: '',
  //   display: '',
  //   mono: '',
  // },
  // fontSize: {
  //   xs: 12,
  //   sm: 14,
  //   md: 16,
  //   lg: 18,
  //   xl: 24,
  //   '2xl': 32,
  // },
  // fontWeight: {
  //   regular: '400',
  //   medium: '500',
  //   semibold: '600',
  //   bold: '700',
  // },
  // lineHeight: {
  //   tight: 1.2,
  //   normal: 1.5,
  //   relaxed: 1.75,
  // },
  // letterSpacing: {
  //   tight: -0.02,
  //   normal: 0,
  //   wide: 0.02,
  // },
  // styles: {
  //   heading1: {},
  //   heading2: {},
  //   heading3: {},
  //   body: {},
  //   bodySmall: {},
  //   caption: {},
  //   label: {},
  //   button: {},
  // },
} as const;

export type TypographyToken = keyof typeof typography;
