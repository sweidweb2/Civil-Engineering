/**
 * index.ts — single entry point for the mobile theme.
 *
 * Components should import from here:
 *   import { theme, colors, spacing } from '@/theme'
 *   // or: import { theme } from '../theme'
 *
 * Mobile omits breakpoints + zIndex (web-only).
 */

export * from './colors';
export * from './spacing';
export * from './typography';
export * from './radius';
export * from './shadows';
export * from './sizes';

import { colors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';
import { radius } from './radius';
import { shadows } from './shadows';
import { sizes } from './sizes';

export const theme = {
  colors,
  spacing,
  typography,
  radius,
  shadows,
  sizes,
} as const;

export type Theme = typeof theme;
