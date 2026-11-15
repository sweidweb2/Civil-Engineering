import type { ColorToken } from '@/theme/colors'

/** Semantic tone shared by pills, icon tiles and stat cards. */
export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

/** Literal class strings so Tailwind can see them at build time. */
export const TONE_BG: Record<Tone, string> = {
  primary: 'bg-primary/10',
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  danger: 'bg-destructive/10',
  info: 'bg-info/10',
  neutral: 'bg-muted',
}

export const TONE_TEXT: Record<Tone, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-info',
  neutral: 'text-muted-foreground',
}

export const TONE_DOT: Record<Tone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-info',
  neutral: 'bg-muted-foreground',
}

/** Palette token for props that need a raw color (icons). */
export const TONE_COLOR: Record<Tone, ColorToken> = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'error',
  info: 'info',
  neutral: 'textMuted',
}

const STATUS_TONES: Record<string, Tone> = {
  // users / listings / categories
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  // providers / reviews / approvals
  PENDING: 'warning',
  APPROVED: 'success',
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
}

export function toneForStatus(status: string | null | undefined): Tone {
  return (status && STATUS_TONES[status]) || 'neutral'
}
