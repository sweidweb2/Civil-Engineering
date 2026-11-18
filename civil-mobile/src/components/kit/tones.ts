import type { ColorToken } from '@/theme/colors'

/**
 * Semantic tone for state pills and status text. The UI is near-monochrome:
 * `primary`/`success` resolve to the one accent, `warning`/`danger` to their
 * meaning colors, `info`/`neutral` to ink tints. Tone never decorates.
 */
export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

/** 12% tint behind a state pill. Literal strings so Tailwind sees them. */
export const TONE_BG: Record<Tone, string> = {
  primary: 'bg-primary/12',
  success: 'bg-primary/12',
  warning: 'bg-warning/12',
  danger: 'bg-destructive/12',
  info: 'bg-muted',
  neutral: 'bg-muted',
}

export const TONE_TEXT: Record<Tone, string> = {
  primary: 'text-primary',
  success: 'text-primary',
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-ink-2',
  neutral: 'text-muted-foreground',
}

export const TONE_DOT: Record<Tone, string> = {
  primary: 'bg-primary',
  success: 'bg-primary',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-data-2',
  neutral: 'bg-data-3',
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

const STATUS_TONES: Record<string, Tone> = {
  // users / listings / categories
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  // providers / reviews / approvals
  PENDING: 'warning',
  APPROVED: 'success',
  ACCEPTED: 'success',
  SUSPENDED: 'danger',
  REJECTED: 'danger',
  HIDDEN: 'neutral',
  // projects / stages
  DRAFT: 'neutral',
  PLANNING: 'info',
  IN_PROGRESS: 'primary',
  ON_HOLD: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  NOT_STARTED: 'neutral',
  // workers
  AVAILABLE: 'success',
  BUSY: 'warning',
  UNAVAILABLE: 'neutral',
  VERIFIED: 'success',
  REQUESTED: 'warning',
  UNVERIFIED: 'info',
}

export function toneForStatus(status: string | null | undefined): Tone {
  return (status && STATUS_TONES[status]) || 'neutral'
}
