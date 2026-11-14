export function parseStageDate(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/** Store as ISO datetime midnight UTC from a calendar date. */
export function stageDateToIso(date: Date | undefined): string {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}T00:00:00.000Z`
}

export function stageDateToIsoOrNull(date: Date | undefined): string | null {
  const value = stageDateToIso(date)
  return value === '' ? null : value
}
