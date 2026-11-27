/** Share of time elapsed from the start date to the end date, as 0–100. */
export function scheduleProgress(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  now: Date = new Date(),
): number {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  const current = now.getTime()
  if (current <= start) return 0
  if (current >= end) return 100
  return Math.round(((current - start) / (end - start)) * 100)
}

export type ProgressInput = {
  startDate?: string | Date | null
  endDate?: string | Date | null
  status?: string | null
  /** Last write to the project; approximates when it was put on hold / cancelled. */
  updatedAt?: string | Date | null
}

function iso(value: string | Date | null | undefined): string | null {
  if (value == null) return null
  return value instanceof Date ? value.toISOString() : value
}

/**
 * Status-aware progress shown on cards, detail and the dashboard average.
 *
 * - COMPLETED is always 100 (a project finished early is not "62% done").
 * - DRAFT has not started: 0.
 * - ON_HOLD / CANCELLED stop the clock at their last update instead of drifting to 100.
 * - Every other status follows the schedule (`scheduleProgress`).
 */
export function projectProgress(project: ProgressInput, now: Date = new Date()): number {
  const status = project.status ?? null
  if (status === 'COMPLETED') return 100
  if (status === 'DRAFT') return 0
  let asOf = now
  if ((status === 'ON_HOLD' || status === 'CANCELLED') && project.updatedAt) {
    const frozen = new Date(project.updatedAt)
    if (Number.isFinite(frozen.getTime()) && frozen.getTime() < now.getTime()) asOf = frozen
  }
  return scheduleProgress(iso(project.startDate), iso(project.endDate), asOf)
}
