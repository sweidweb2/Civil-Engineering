import type { LucideIcon } from 'lucide-react-native'
import {
  BadgeCheck,
  Banknote,
  Briefcase,
  GraduationCap,
  UserRound,
  Wrench,
} from 'lucide-react-native'

import type { CvSectionKey } from '@/features/worker/cvCompleteness'
import type { WorkerAvailability, WorkerVerificationStatus } from '@/services/workers'

import type { WkTone } from './palette'

export const CV_SECTION_META: Record<CvSectionKey, { icon: LucideIcon; href: string }> = {
  basics: { icon: UserRound, href: '/worker/cv/basics' },
  experience: { icon: Briefcase, href: '/worker/cv/experience' },
  education: { icon: GraduationCap, href: '/worker/cv/education' },
  certifications: { icon: BadgeCheck, href: '/worker/cv/certifications' },
  skills: { icon: Wrench, href: '/worker/cv/skills' },
  rates: { icon: Banknote, href: '/worker/cv/rates' },
}

export const AVAILABILITY_TONE: Record<WorkerAvailability, WkTone> = {
  AVAILABLE: 'green',
  BUSY: 'amber',
  UNAVAILABLE: 'neutral',
}

export const SKILL_LEVEL_TONE = { EXPERT: 'green', INTERMEDIATE: 'teal', BASIC: 'neutral' } as const

export const VERIFICATION_KEY: Record<
  WorkerVerificationStatus,
  { title: string; description: string; short: string; tone: WkTone }
> = {
  VERIFIED: {
    title: 'workerHome.verifiedTitle',
    description: 'workerHome.verifiedDescription',
    short: 'workerHome.verifiedShort',
    tone: 'green',
  },
  REQUESTED: {
    title: 'workerHome.requestedTitle',
    description: 'workerHome.requestedDescription',
    short: 'workerHome.requestedShort',
    tone: 'amber',
  },
  UNVERIFIED: {
    title: 'workerHome.unverifiedTitle',
    description: 'workerHome.unverifiedDescription',
    short: 'workerHome.unverifiedShort',
    tone: 'neutral',
  },
}

/** Currencies offered on the Rates screen (a stored value outside this list is kept). */
export const WORKER_CURRENCIES = ['SAR', 'AED', 'USD', 'EGP'] as const

/** "Mar 2021" style month label for ISO dates, in the UI locale. */
export function formatMonth(iso: string | null | undefined, locale: string): string {
  if (!iso) return ''
  const m = /^(\d{4})-(\d{2})/.exec(iso)
  if (!m) return iso
  return new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString(locale, {
    month: 'short',
    year: 'numeric',
  })
}

/** Today as YYYY-MM-DD in local time (for expiry comparisons on ISO dates). */
export function todayIso(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
