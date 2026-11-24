import type { WorkerProfile } from '@/services/workers'

/** The fields completeness reads; satisfied by both a loaded profile and a write payload. */
export type CvShape = Pick<
  WorkerProfile,
  'headline' | 'specialty' | 'city' | 'yearsExperience' | 'hourlyRate' | 'dailyRate'
> & {
  experiences: readonly unknown[]
  education: readonly unknown[]
  certifications: readonly unknown[]
  skills: readonly unknown[]
}

export type CvSectionKey =
  'basics' | 'experience' | 'education' | 'certifications' | 'skills' | 'rates'

export type CvSectionStatus = {
  key: CvSectionKey
  done: boolean
  count?: number
}

/** Lightweight completeness for the worker home / CV hub. */
export function cvSectionStatuses(profile: CvShape | null): CvSectionStatus[] {
  const hasBasics = Boolean(
    profile?.headline ||
    profile?.specialty ||
    profile?.city ||
    (profile?.yearsExperience != null && profile.yearsExperience > 0),
  )
  const hasRates = Boolean(profile?.hourlyRate || profile?.dailyRate)

  return [
    { key: 'basics', done: hasBasics },
    {
      key: 'experience',
      done: (profile?.experiences.length ?? 0) > 0,
      count: profile?.experiences.length ?? 0,
    },
    {
      key: 'education',
      done: (profile?.education.length ?? 0) > 0,
      count: profile?.education.length ?? 0,
    },
    {
      key: 'certifications',
      done: (profile?.certifications.length ?? 0) > 0,
      count: profile?.certifications.length ?? 0,
    },
    {
      key: 'skills',
      done: (profile?.skills.length ?? 0) > 0,
      count: profile?.skills.length ?? 0,
    },
    { key: 'rates', done: hasRates },
  ]
}

export function cvCompletenessPercent(profile: CvShape | null): number {
  const sections = cvSectionStatuses(profile)
  const done = sections.filter((s) => s.done).length
  return Math.round((done / sections.length) * 100)
}

/** Sections still missing, in CV order. */
export function cvMissingSections(profile: CvShape | null): CvSectionKey[] {
  return cvSectionStatuses(profile)
    .filter((s) => !s.done)
    .map((s) => s.key)
}
