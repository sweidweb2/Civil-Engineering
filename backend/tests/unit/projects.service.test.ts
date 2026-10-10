import { describe, expect, it, vi } from 'vitest'

import type { ProjectsRepository } from '../../src/modules/projects/projects.repository.js'
import { createProjectsService } from '../../src/modules/projects/projects.service.js'
import type { Project } from '../../src/modules/projects/projects.types.js'

const owner = { id: 'owner-1', roles: ['MANAGER'] }
const admin = { id: 'admin-1', roles: ['ADMIN'] }
const other = { id: 'other-1', roles: ['CLIENT'] }

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    name: 'Site A',
    description: null,
    code: 'SITE-A',
    ownerId: owner.id,
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
    ...overrides,
  }
}

function setup(existing: Project | null = makeProject()) {
  const repository: ProjectsRepository = {
    findMany: vi.fn(async () => ({
      projects: existing ? [{ ...existing, mainImageStoragePath: null }] : [],
      total: existing ? 1 : 0,
    })),
    findById: vi.fn(async () => existing),
    findByCode: vi.fn(async (code) => (existing?.code === code ? existing : null)),
    create: vi.fn(async (input) => makeProject({ ...input, id: 'p-new' })),
    update: vi.fn(async (id, input) => makeProject({ id, ...input })),
    delete: vi.fn(async () => undefined),
  }
  return { repository, service: createProjectsService(repository) }
}

describe('projectsService', () => {
  it('lists projects scoped to the owner for non-admins', async () => {
    const { service, repository } = setup()
    const result = await service.listProjects({ page: 2, limit: 10 }, owner)
    expect(result.data).toHaveLength(1)
    expect(result.meta).toMatchObject({ total: 1, page: 2, limit: 10, totalPages: 1 })
    expect(repository.findMany).toHaveBeenCalledWith({ page: 2, limit: 10 }, owner.id)
  })

  it('lists all projects for admins', async () => {
    const { service, repository } = setup()
    await service.listProjects({ page: 1, limit: 20 }, admin)
    expect(repository.findMany).toHaveBeenCalledWith({ page: 1, limit: 20 }, undefined)
  })

  it('creates a project for an owner', async () => {
    const { service, repository } = setup(null)
    const created = await service.createProject({ name: 'Tower B' }, owner.id)
    expect(created.name).toBe('Tower B')
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ ownerId: owner.id }))
  })

  it('rejects duplicate project codes on create', async () => {
    const { service } = setup(makeProject({ code: 'SITE-A' }))
    await expect(service.createProject({ name: 'Other', code: 'SITE-A' }, owner.id)).rejects.toMatchObject({
      code: 'CODE_IN_USE',
      status: 409,
    })
  })

  it('lets the owner update a project', async () => {
    const { service, repository } = setup()
    await service.updateProject('p1', { name: 'Site A Renamed' }, owner)
    expect(repository.update).toHaveBeenCalledWith('p1', { name: 'Site A Renamed', progress: 0 })
  })

  it('forbids a non-owner from updating', async () => {
    const { service } = setup()
    await expect(service.updateProject('p1', { name: 'Nope' }, other)).rejects.toMatchObject({
      status: 403,
    })
  })

  it('lets an admin archive a project', async () => {
    const { service, repository } = setup()
    await service.archiveProject('p1', admin)
    expect(repository.delete).toHaveBeenCalledWith('p1')
  })

  it('stores progress from the start and end dates', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-06T00:00:00.000Z'))
    try {
      const { service, repository } = setup(makeProject())
      await service.updateProject(
        'p1',
        {
          startDate: '2026-10-01T00:00:00.000Z',
          endDate: '2026-10-11T00:00:00.000Z',
        },
        owner,
      )
      expect(repository.update).toHaveBeenCalledWith('p1', expect.objectContaining({ progress: 50 }))
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects an end date that is not after the start date', async () => {
    const { service } = setup(makeProject())
    await expect(
      service.updateProject(
        'p1',
        {
          startDate: '2026-10-11T00:00:00.000Z',
          endDate: '2026-10-01T00:00:00.000Z',
        },
        owner,
      ),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('rejects code collisions on update', async () => {
    const existingOther = makeProject({ id: 'p2', code: 'SITE-B' })
    const { repository, service } = setup(makeProject())
    vi.mocked(repository.findByCode).mockResolvedValue(existingOther)
    await expect(service.updateProject('p1', { code: 'SITE-B' }, owner)).rejects.toMatchObject({
      code: 'CODE_IN_USE',
      status: 409,
    })
  })
})
