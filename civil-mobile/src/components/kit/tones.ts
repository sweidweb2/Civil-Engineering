import type { ColorToken } from '@/theme/colors'

/**
 * Semantic tone for state pills and status text. The UI is near-monochrome:
 * `primary`/`success` resolve to the one accent, `warning`/`danger` to their
 * meaning colors, `info`/`neutral` to ink tints. Tone never decorates.
 */
export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export const TONE_TEXT: Record<Tone, string> = {
  primary: 'text-primary',
  success: 'text-primary',
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-ink-2',
  neutral: 'text-muted-foreground',
}

/** Palette role for props that need a raw color (icons). */
export const TONE_COLOR: Record<Tone, ColorToken> = {
  primary: 'accent',
  success: 'accent',
  warning: 'warning',
  danger: 'negative',
  info: 'ink2',
  neutral: 'muted',
}
