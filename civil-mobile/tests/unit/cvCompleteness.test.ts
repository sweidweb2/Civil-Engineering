import { cvSectionStatuses } from '@/features/worker/cvCompleteness'
import type { WorkerProfile } from '@/services/workers'

function makeProfile(overrides: Partial<WorkerProfile> = {}): WorkerProfile {
  return {
    id: 'wp-1',
    userId: 'worker-1',
    headline: null,
    bio: null,
    specialty: null,
    yearsExperience: null,
    languages: null,
    city: null,
    country: null,
    hourlyRate: null,
    dailyRate: null,
    currency: null,
    availability: 'AVAILABLE',
    isPublic: false,
    cvUrl: null,
    experiences: [],
    education: [],
    certifications: [],
    skills: [],
    user: {
      id: 'worker-1',
      email: 'w@example.com',
      status: 'ACTIVE',
      verificationStatus: 'UNVERIFIED',
      isVerified: false,
      firstName: null,
      lastName: null,
      displayName: null,
      phone: null,
      avatarUrl: null,
    },
    createdAt: '2026-11-18T00:00:00.000Z',
    updatedAt: '2026-11-18T00:00:00.000Z',
    ...overrides,
  }
}

describe('cvSectionStatuses', () => {
  it('does not mark rates done from default availability alone', () => {
    const sections = cvSectionStatuses(makeProfile())
    expect(sections.find((s) => s.key === 'rates')?.done).toBe(false)
  })

  it('marks rates done when an hourly rate is set', () => {
    const sections = cvSectionStatuses(makeProfile({ hourlyRate: '20', currency: 'USD' }))
    expect(sections.find((s) => s.key === 'rates')?.done).toBe(true)
  })
})
