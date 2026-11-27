import { apiRequest } from './api'

export type ProjectProductivityHourEntry = {
  id: string
  projectId: string
  /** Calendar day `YYYY-MM-DD`. */
  date: string
  /** Hours as decimal string (e.g. `"8"`, `"8.5"`). */
  hours: string
  createdAt: string
  updatedAt: string
}

export type UpsertProductivityHoursInput = {
  hours: string
  /** Local calendar day `YYYY-MM-DD`. */
  date: string
}

export function listProjectProductivityHours(projectId: string) {
  return apiRequest<{ data: ProjectProductivityHourEntry[] }>(
    `/projects/${projectId}/productivity-hours`,
  )
}

export function upsertProjectProductivityHours(
  projectId: string,
  body: UpsertProductivityHoursInput,
) {
  return apiRequest<{ data: ProjectProductivityHourEntry }>(
    `/projects/${projectId}/productivity-hours`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  )
}

/** Local calendar day as `YYYY-MM-DD`. */
export function localTodayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * UX validation aligned with backend `HOURS_PATTERN`:
 * 0–24 inclusive, at most one digit after the decimal, no leading zeros
 * (except `0` / `0.5`).
 */
const HOURS_PATTERN = /^(?:24(?:\.0)?|(?:\d|[1]\d|2[0-3])(?:\.\d)?)$/

export function validateHoursInput(raw: string): string | null {
  const value = raw.trim()
  if (!value) return 'required'
  if (!HOURS_PATTERN.test(value)) {
    const n = Number(value)
    if (Number.isFinite(n) && n >= 0 && n <= 24) return 'format'
    return 'range'
  }
  return null
}
