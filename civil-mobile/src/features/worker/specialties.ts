/**
 * Hardcoded worker specialties for the Basics picker.
 * Store `id` in the API/DB; display `en` / `ar` from the active UI language.
 */
export type WorkerSpecialty = {
  id: string
  en: string
  ar: string
}

export const WORKER_SPECIALTIES: readonly WorkerSpecialty[] = [
  { id: 'masonry', en: 'Masonry', ar: 'بناء وطوب' },
  { id: 'steel-fixing', en: 'Steel fixing', ar: 'حدادة تسليح' },
  { id: 'equipment-operators', en: 'Equipment operators', ar: 'مشغّلو آليات' },
  { id: 'carpentry-formwork', en: 'Carpentry & formwork', ar: 'نجارة وشدّات' },
  { id: 'electricians', en: 'Electricians', ar: 'كهربائيون' },
  { id: 'plumbers', en: 'Plumbers', ar: 'سباكون' },
  { id: 'welders', en: 'Welders', ar: 'لحّامون' },
  { id: 'painters-finishers', en: 'Painters & finishers', ar: 'دهّانون وتشطيب' },
  { id: 'site-engineers', en: 'Site engineers', ar: 'مهندسو موقع' },
  { id: 'foremen', en: 'Foremen', ar: 'مراقبون' },
] as const

const byId = new Map(WORKER_SPECIALTIES.map((item) => [item.id, item]))

function isArabic(language?: string | null): boolean {
  return Boolean(language?.startsWith('ar'))
}

/** Localized label for a stored specialty id (falls back to raw text for legacy values). */
export function specialtyLabel(
  specialtyId: string | null | undefined,
  language?: string | null,
): string {
  if (!specialtyId) return ''
  const hit =
    byId.get(specialtyId) ??
    WORKER_SPECIALTIES.find(
      (item) => item.en.toLowerCase() === specialtyId.toLowerCase() || item.ar === specialtyId,
    )
  if (!hit) return specialtyId
  return isArabic(language) ? hit.ar : hit.en
}

export function specialtyOptions(language?: string | null): { value: string; label: string }[] {
  const ar = isArabic(language)
  return WORKER_SPECIALTIES.map((item) => ({
    value: item.id,
    label: ar ? item.ar : item.en,
  }))
}
