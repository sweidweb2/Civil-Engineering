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
