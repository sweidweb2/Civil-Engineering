import type { TFunction } from 'i18next'

import type { Project, ProjectStatus, ProjectType } from '@/services/projects'

export type ProjectFormValues = {
  name: string
  code: string
  type: ProjectType | ''
  status: ProjectStatus
  description: string
  address: string
  city: string
  country: string
  startDate: string
  endDate: string
  notes: string
}

export type ProjectFormErrors = Partial<Record<keyof ProjectFormValues, string>>

export const EMPTY_PROJECT_FORM: ProjectFormValues = {
  name: '',
  code: '',
  type: '',
  status: 'DRAFT',
  description: '',
  address: '',
  city: '',
  country: '',
  startDate: '',
  endDate: '',
  notes: '',
}

export function formFromProject(p: Project): ProjectFormValues {
  return {
    name: p.name ?? '',
    code: p.code ?? '',
    type: p.type ?? '',
    status: p.status,
    description: p.description ?? '',
    address: p.address ?? '',
    city: p.city ?? '',
    country: p.country ?? '',
    startDate: p.startDate?.slice(0, 10) ?? '',
    endDate: p.endDate?.slice(0, 10) ?? '',
    notes: p.notes ?? '',
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: string) {
  if (!ISO_DATE.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value)
}

/**
 * The projects API validates dates with `z.string().datetime()`, which rejects a bare
 * `YYYY-MM-DD`. Send UTC midnight so the calendar day round-trips through `slice(0, 10)`.
 */
export function toApiDate(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? `${trimmed}T00:00:00.000Z` : null
}

/** Field errors for the basics + schedule part of a project form. */
export function validateProject(t: TFunction, v: ProjectFormValues): ProjectFormErrors {
  const e: ProjectFormErrors = {}
  if (!v.name.trim()) e.name = t('projects.nameRequired')
  for (const key of ['startDate', 'endDate'] as const) {
    const value = v[key].trim()
    if (value && !isIsoDate(value)) e[key] = t('pmPortal.dateFormat')
  }
  if (!e.startDate && !e.endDate && v.startDate && v.endDate && v.endDate <= v.startDate) {
    // Backend requires end strictly after start.
    e.endDate = t('pmPortal.endBeforeStart')
  }
  return e
}
