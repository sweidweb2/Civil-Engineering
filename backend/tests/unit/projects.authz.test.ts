import { describe, expect, it, vi } from 'vitest'

import { AppError } from '../../src/errors/app-error.js'
import type { ProjectsRepository } from '../../src/modules/projects/projects.repository.js'
import { createProjectsService } from '../../src/modules/projects/projects.service.js'
import type { Project } from '../../src/modules/projects/projects.types.js'

const sample: Project = {
  id: 'p1',
  name: 'Site A',
  description: null,
  code: null,
  ownerId: 'owner-1',
  address: null,
  city: null,
  country: null,
  startDate: null,
  endDate: null,
  actualStartDate: null,
  actualEndDate: null,
  status: 'IN_PROGRESS',
  progress: 0,
  budget: null,
  currency: 'USD',
  actualCost: null,
  type: null,
  isPublic: false,
  tags: null,
  attachments: null,
  notes: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  archivedAt: null,
}

describe('projectsService.assertAccessible', () => {
  function serviceWith(project: Project | null) {
    const repository: ProjectsRepository = {
      findMany: vi.fn(async () => ({ projects: [], total: 0 })),
      findById: vi.fn(async () => project),
      findByCode: vi.fn(async () => null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
    return createProjectsService(repository)
  }

  it('returns the project for the owner', async () => {
    const service = serviceWith(sample)
    await expect(
      service.assertAccessible('p1', { id: 'owner-1', roles: ['CLIENT'] }),
    ).resolves.toEqual(sample)
  })

  it('returns the project for an admin non-owner', async () => {
    const service = serviceWith(sample)
    await expect(
      service.assertAccessible('p1', { id: 'admin-1', roles: ['ADMIN'] }),
    ).resolves.toEqual(sample)
  })

  it('forbids a non-owner non-admin', async () => {
    const service = serviceWith(sample)
    try {
      await service.assertAccessible('p1', { id: 'other', roles: ['CLIENT'] })
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).status).toBe(403)
    }
  })

  it('throws not found when missing', async () => {
    const service = serviceWith(null)
    try {
      await service.assertAccessible('missing', { id: 'owner-1', roles: ['CLIENT'] })
      expect.unreachable()
    } catch (error) {
      expect((error as AppError).status).toBe(404)
      expect((error as AppError).code).toBe('PROJECT_NOT_FOUND')
    }
  })
})
