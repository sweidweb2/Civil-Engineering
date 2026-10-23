import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ManagerProfilesRepository } from '../../src/modules/manager-profiles/manager-profiles.repository.js'
import { createManagerProfilesService } from '../../src/modules/manager-profiles/manager-profiles.service.js'
import type { ManagerProfile } from '../../src/modules/manager-profiles/manager-profiles.types.js'

function makeProfile(overrides: Partial<ManagerProfile> = {}): ManagerProfile {
  return {
    id: 'mp-1',
    userId: 'user-1',
    headline: 'Civil engineer',
    bio: 'Bio',
    yearsExperience: 5,
    specialty: 'Structural',
    education: null,
    certifications: null,
    skills: null,
    languages: null,
    city: 'Beirut',
    country: 'Lebanon',
    website: null,
    linkedinUrl: null,
    cvUrl: null,
    availability: null,
    projectTypes: null,
    createdAt: '2026-10-23T00:00:00.000Z',
    updatedAt: '2026-10-23T00:00:00.000Z',
    ...overrides,
  }
}

describe('managerProfilesService', () => {
  let repository: ManagerProfilesRepository

  beforeEach(() => {
    repository = {
      findByUserId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteByUserId: vi.fn(),
    }
  })

  it('returns null when no profile exists', async () => {
    vi.mocked(repository.findByUserId).mockResolvedValue(null)
    const service = createManagerProfilesService(repository)
    await expect(service.getMine('user-1')).resolves.toBeNull()
  })

  it('creates a profile when none exists', async () => {
    vi.mocked(repository.findByUserId).mockResolvedValue(null)
    vi.mocked(repository.create).mockResolvedValue(makeProfile())
    const service = createManagerProfilesService(repository)

    const created = await service.createMine('user-1', { headline: 'Civil engineer' })
    expect(created.headline).toBe('Civil engineer')
    expect(repository.create).toHaveBeenCalledWith('user-1', { headline: 'Civil engineer' })
  })

  it('rejects create when a profile already exists', async () => {
    vi.mocked(repository.findByUserId).mockResolvedValue(makeProfile())
    const service = createManagerProfilesService(repository)

    await expect(service.createMine('user-1', { headline: 'Other' })).rejects.toMatchObject({
      status: 409,
      code: 'MANAGER_PROFILE_EXISTS',
    })
  })

  it('updates an existing profile', async () => {
    vi.mocked(repository.findByUserId).mockResolvedValue(makeProfile())
    vi.mocked(repository.update).mockResolvedValue(makeProfile({ headline: 'Updated' }))
    const service = createManagerProfilesService(repository)

    const updated = await service.updateMine('user-1', { headline: 'Updated' })
    expect(updated.headline).toBe('Updated')
  })

  it('rejects update when missing', async () => {
    vi.mocked(repository.findByUserId).mockResolvedValue(null)
    const service = createManagerProfilesService(repository)

    await expect(service.updateMine('user-1', { headline: 'Updated' })).rejects.toMatchObject({
      status: 404,
      code: 'MANAGER_PROFILE_NOT_FOUND',
    })
  })

  it('upserts by creating or updating', async () => {
    const service = createManagerProfilesService(repository)

    vi.mocked(repository.findByUserId).mockResolvedValueOnce(null)
    vi.mocked(repository.create).mockResolvedValue(makeProfile())
    await service.upsertMine('user-1', { city: 'Beirut' })
    expect(repository.create).toHaveBeenCalled()

    vi.mocked(repository.findByUserId).mockResolvedValueOnce(makeProfile())
    vi.mocked(repository.update).mockResolvedValue(makeProfile({ city: 'Tripoli' }))
    await service.upsertMine('user-1', { city: 'Tripoli' })
    expect(repository.update).toHaveBeenCalledWith('user-1', { city: 'Tripoli' })
  })

  it('deletes an existing profile', async () => {
    vi.mocked(repository.findByUserId).mockResolvedValue(makeProfile())
    vi.mocked(repository.deleteByUserId).mockResolvedValue(undefined)
    const service = createManagerProfilesService(repository)

    await expect(service.deleteMine('user-1')).resolves.toBeUndefined()
    expect(repository.deleteByUserId).toHaveBeenCalledWith('user-1')
  })

  it('rejects delete when missing', async () => {
    vi.mocked(repository.findByUserId).mockResolvedValue(null)
    const service = createManagerProfilesService(repository)

    await expect(service.deleteMine('user-1')).rejects.toMatchObject({
      status: 404,
      code: 'MANAGER_PROFILE_NOT_FOUND',
    })
  })
})
