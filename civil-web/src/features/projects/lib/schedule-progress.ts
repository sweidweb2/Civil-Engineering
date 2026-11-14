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

/** Whole days between start and end (inclusive span), or null when dates are missing/invalid. */
export function scheduleDurationDays(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): number | null {
  if (!startDate || !endDate) return null
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)))
}

export function scheduleDurationMonthsLabel(days: number): number {
  return Math.round((days / 30.44) * 10) / 10
}
