import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WorkersRepository } from '../../src/modules/workers/workers.repository.js'
import type { UpsertWorkerProfileBody } from '../../src/modules/workers/workers.schema.js'
import { createWorkersService } from '../../src/modules/workers/workers.service.js'
import type { WorkerProfile } from '../../src/modules/workers/workers.types.js'

function makeProfile(overrides: Partial<WorkerProfile> = {}): WorkerProfile {
  return {
    id: 'wp-1',
    userId: 'worker-1',
    headline: 'Welder',
    bio: null,
    primaryTrade: 'Welding',
    yearsExperience: 5,
    languages: null,
    city: 'Beirut',
    country: 'Lebanon',
    hourlyRate: '15',
    dailyRate: null,
    currency: 'USD',
    availability: 'AVAILABLE',
    isPublic: true,
    cvUrl: null,
    experiences: [],
    education: [],
    certifications: [],
    skills: [],
    user: {
      id: 'worker-1',
      email: 'w@example.com',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      isVerified: true,
      firstName: 'Ali',
      lastName: 'Haj',
      displayName: 'Ali Haj',
      phone: '+96170000000',
      avatarUrl: null,
    },
    createdAt: '2026-11-18T00:00:00.000Z',
    updatedAt: '2026-11-18T00:00:00.000Z',
    ...overrides,
  }
}

function fullPut(overrides: Partial<UpsertWorkerProfileBody> = {}): UpsertWorkerProfileBody {
  return {
    headline: null,
    bio: null,
    primaryTrade: null,
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
    ...overrides,
  }
}

describe('workersService', () => {
  let repository: WorkersRepository

  beforeEach(() => {
    repository = {
      findByUserId: vi.fn(),
      findUserRole: vi.fn(),
      findVerificationState: vi.fn(),
      setVerificationRequested: vi.fn(),
      updateVisibility: vi.fn(),
      ensureProfileWithVisibility: vi.fn(),
      countActiveWorkerCategories: vi.fn(),
      upsertWithChildren: vi.fn(),
      deleteByUserId: vi.fn(),
      list: vi.fn(),
    }
  })

  it('returns verification status from getMine even without a profile', async () => {
    vi.mocked(repository.findByUserId).mockResolvedValue(null)
    vi.mocked(repository.findVerificationState).mockResolvedValue({
      role: 'WORKER',
      verificationStatus: 'REQUESTED',
    })
    const service = createWorkersService(repository)
    await expect(service.getMine('worker-1')).resolves.toEqual({
      profile: null,
      verificationStatus: 'REQUESTED',
    })
  })

  it('upserts only for WORKER role and valid skill categories', async () => {
    vi.mocked(repository.findUserRole).mockResolvedValue('WORKER')
    vi.mocked(repository.countActiveWorkerCategories).mockResolvedValue(1)
    vi.mocked(repository.upsertWithChildren).mockResolvedValue(makeProfile())
    const service = createWorkersService(repository)

    await service.upsertMine(
      'worker-1',
      fullPut({ skills: [{ categoryId: 'cat-1', level: 'EXPERT' }] }),
    )
    expect(repository.upsertWithChildren).toHaveBeenCalled()
  })

  it('rejects upsert for non-worker roles', async () => {
    vi.mocked(repository.findUserRole).mockResolvedValue('CLIENT')
    const service = createWorkersService(repository)
    await expect(service.upsertMine('u-1', fullPut())).rejects.toMatchObject({
      code: 'WORKER_PROFILE_ROLE_REQUIRED',
    })
  })

  it('rejects invalid skill categories', async () => {
    vi.mocked(repository.findUserRole).mockResolvedValue('WORKER')
    vi.mocked(repository.countActiveWorkerCategories).mockResolvedValue(0)
    const service = createWorkersService(repository)
    await expect(
      service.upsertMine('worker-1', fullPut({ skills: [{ categoryId: 'bad', level: 'BASIC' }] })),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('hides non-public profiles from non-owners', async () => {
    vi.mocked(repository.findByUserId).mockResolvedValue(
      makeProfile({
        isPublic: false,
        user: { ...makeProfile().user, verificationStatus: 'UNVERIFIED', isVerified: false },
      }),
    )
    const service = createWorkersService(repository)
    await expect(
      service.getByUserId('worker-1', { id: 'other', roles: ['CLIENT'] }),
    ).rejects.toMatchObject({ code: 'WORKER_PROFILE_NOT_PUBLIC' })
  })

  it('redacts email and phone for marketplace viewers', async () => {
    vi.mocked(repository.findByUserId).mockResolvedValue(makeProfile())
    const service = createWorkersService(repository)
    const profile = await service.getByUserId('worker-1', { id: 'client-1', roles: ['CLIENT'] })
    expect(profile.user.email).toBeNull()
    expect(profile.user.phone).toBeNull()
  })

  it('strips inactive skills for marketplace viewers', async () => {
    vi.mocked(repository.findByUserId).mockResolvedValue(
      makeProfile({
        skills: [
          {
            id: 's1',
            categoryId: 'c1',
            categoryName: 'Welding',
            categoryNameAr: null,
            categoryIsActive: true,
            level: 'EXPERT',
          },
          {
            id: 's2',
            categoryId: 'c2',
            categoryName: 'Old trade',
            categoryNameAr: null,
            categoryIsActive: false,
            level: 'BASIC',
          },
        ],
      }),
    )
    const service = createWorkersService(repository)
    const profile = await service.getByUserId('worker-1', { id: 'client-1', roles: ['CLIENT'] })
    expect(profile.skills).toHaveLength(1)
    expect(profile.skills[0]?.categoryId).toBe('c1')
  })

  it('keeps inactive skills for the owner', async () => {
    vi.mocked(repository.findByUserId).mockResolvedValue(
      makeProfile({
        skills: [
          {
            id: 's2',
            categoryId: 'c2',
            categoryName: 'Old trade',
            categoryNameAr: null,
            categoryIsActive: false,
            level: 'BASIC',
          },
        ],
      }),
    )
    const service = createWorkersService(repository)
    const profile = await service.getByUserId('worker-1', { id: 'worker-1', roles: ['WORKER'] })
    expect(profile.skills).toHaveLength(1)
  })

  it('lists public-only for non-admins and guests', async () => {
    vi.mocked(repository.list).mockResolvedValue({
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        availabilityCounts: { AVAILABLE: 0, BUSY: 0, UNAVAILABLE: 0 },
      },
    })
    const service = createWorkersService(repository)
    await service.list({ page: 1, limit: 20, counts: true }, { id: 'c1', roles: ['CLIENT'] })
    expect(repository.list).toHaveBeenCalledWith(
      expect.objectContaining({ publicOnly: true, verificationStatus: undefined }),
    )
    await service.list({ page: 1, limit: 20, counts: true }, null)
    expect(repository.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ publicOnly: true, verificationStatus: undefined }),
    )
  })

  it('requests verification for workers with a minimum CV', async () => {
    vi.mocked(repository.findVerificationState).mockResolvedValue({
      role: 'WORKER',
      verificationStatus: 'UNVERIFIED',
    })
    vi.mocked(repository.findByUserId).mockResolvedValue(makeProfile())
    const service = createWorkersService(repository)
    await expect(service.requestVerification('worker-1')).resolves.toEqual({
      verificationStatus: 'REQUESTED',
    })
    expect(repository.setVerificationRequested).toHaveBeenCalledWith('worker-1')
  })

  it('rejects verification when the CV is empty', async () => {
    vi.mocked(repository.findVerificationState).mockResolvedValue({
      role: 'WORKER',
      verificationStatus: 'UNVERIFIED',
    })
    vi.mocked(repository.findByUserId).mockResolvedValue(null)
    const service = createWorkersService(repository)
    await expect(service.requestVerification('worker-1')).rejects.toMatchObject({
      status: 400,
      details: { code: 'WORKER_VERIFICATION_CV_INCOMPLETE' },
    })
  })

  it('rejects verification request when already verified', async () => {
    vi.mocked(repository.findVerificationState).mockResolvedValue({
      role: 'WORKER',
      verificationStatus: 'VERIFIED',
    })
    const service = createWorkersService(repository)
    await expect(service.requestVerification('worker-1')).rejects.toMatchObject({
      code: 'WORKER_ALREADY_VERIFIED',
    })
  })

  it('lets admins set directory visibility on an existing profile', async () => {
    vi.mocked(repository.findUserRole).mockResolvedValue('WORKER')
    vi.mocked(repository.findByUserId).mockResolvedValue(makeProfile({ isPublic: true }))
    vi.mocked(repository.updateVisibility).mockResolvedValue(makeProfile({ isPublic: false }))
    const service = createWorkersService(repository)
    await service.setVisibility(
      'worker-1',
      { isPublic: false },
      { id: 'admin-1', roles: ['ADMIN'] },
    )
    expect(repository.updateVisibility).toHaveBeenCalledWith('worker-1', false)
  })

  it('creates a profile when admin sets visibility and none exists', async () => {
    vi.mocked(repository.findUserRole).mockResolvedValue('WORKER')
    vi.mocked(repository.findByUserId).mockResolvedValue(null)
    vi.mocked(repository.ensureProfileWithVisibility).mockResolvedValue(
      makeProfile({ isPublic: true }),
    )
    const service = createWorkersService(repository)
    await service.setVisibility('worker-1', { isPublic: true }, { id: 'admin-1', roles: ['ADMIN'] })
    expect(repository.ensureProfileWithVisibility).toHaveBeenCalledWith('worker-1', true)
  })

  it('forbids non-admins from setting visibility', async () => {
    const service = createWorkersService(repository)
    await expect(
      service.setVisibility('worker-1', { isPublic: false }, { id: 'c1', roles: ['CLIENT'] }),
    ).rejects.toMatchObject({ code: 'WORKER_VISIBILITY_ADMIN_ONLY' })
  })
})
