import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProjectWorkersRepository } from '../../src/modules/project-workers/project-workers.repository.js'
import { createProjectWorkersService } from '../../src/modules/project-workers/project-workers.service.js'
import type {
  ProjectWorker,
  WorkerProjectSummary,
} from '../../src/modules/project-workers/project-workers.types.js'
import type { ProjectsService } from '../../src/modules/projects/index.js'
import type { Project } from '../../src/modules/projects/projects.types.js'

const owner = { id: 'owner-1', roles: ['MANAGER'] }
const worker = { id: 'worker-1', roles: ['WORKER'] }
const otherPm = { id: 'pm-2', roles: ['MANAGER'] }

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Tower A',
    description: null,
    code: 'T1',
    ownerId: 'owner-1',
    address: null,
    city: 'Amman',
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

function makeRow(overrides: Partial<ProjectWorker> = {}): ProjectWorker {
  return {
    id: 'pw-1',
    projectId: 'proj-1',
    workerUserId: 'worker-1',
    invitedById: 'owner-1',
    status: 'PENDING',
    invitedAt: '2026-01-02T00:00:00.000Z',
    respondedAt: null,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    worker: {
      id: 'worker-1',
      email: 'w@example.com',
      displayName: 'Worker One',
      firstName: 'Worker',
      lastName: 'One',
      specialty: 'mason',
      city: 'Amman',
      avatarUrl: null,
    },
    ...overrides,
  }
}

function makeMine(overrides: Partial<WorkerProjectSummary> = {}): WorkerProjectSummary {
  return {
    projectWorkerId: 'pw-1',
    status: 'PENDING',
    invitedAt: '2026-01-02T00:00:00.000Z',
    respondedAt: null,
    project: {
      id: 'proj-1',
      name: 'Tower A',
      code: 'T1',
      city: 'Amman',
      country: null,
      status: 'IN_PROGRESS',
      startDate: null,
      endDate: null,
      archivedAt: null,
      owner: {
        id: 'owner-1',
        displayName: 'Owner',
        firstName: 'Own',
        lastName: 'Er',
      },
    },
    ...overrides,
  }
}

describe('projectWorkersService', () => {
  let repository: ProjectWorkersRepository
  let projectsService: ProjectsService
  const notify = { notify: vi.fn(async () => undefined) }

  beforeEach(() => {
    notify.notify.mockClear()
    repository = {
      findManyByProject: vi.fn(async () => ({ rows: [makeRow()], total: 1 })),
      findById: vi.fn(async () => makeRow()),
      findByProjectAndWorker: vi.fn(async () => null),
      findInvitee: vi.fn(async () => ({
        id: 'worker-1',
        role: 'WORKER',
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        isPublic: true,
      })),
      create: vi.fn(async () => makeRow()),
      resetToPending: vi.fn(async () => makeRow({ status: 'PENDING' })),
      deleteById: vi.fn(async () => undefined),
      findWorkerProjects: vi.fn(async () => ({ rows: [makeMine()], total: 1 })),
      findWorkerProject: vi.fn(async () => makeMine()),
      respond: vi.fn(async () =>
        makeRow({ status: 'ACCEPTED', respondedAt: '2026-01-03T00:00:00.000Z' }),
      ),
    }
    projectsService = {
      assertAccessible: vi.fn(async () => makeProject()),
    } as unknown as ProjectsService
  })

  it('invites a verified public worker as PENDING', async () => {
    const service = createProjectWorkersService({ repository, projectsService, notify })
    const row = await service.invite('proj-1', { workerUserId: 'worker-1' }, owner)
    expect(row.status).toBe('PENDING')
    expect(repository.create).toHaveBeenCalled()
    expect(notify.notify).toHaveBeenCalled()
  })

  it('rejects invite from non-owner', async () => {
    const service = createProjectWorkersService({ repository, projectsService, notify })
    await expect(
      service.invite('proj-1', { workerUserId: 'worker-1' }, otherPm),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('conflicts when already PENDING', async () => {
    repository.findByProjectAndWorker = vi.fn(async () => makeRow({ status: 'PENDING' }))
    const service = createProjectWorkersService({ repository, projectsService, notify })
    await expect(
      service.invite('proj-1', { workerUserId: 'worker-1' }, owner),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('re-invites after REJECTED by resetting row', async () => {
    repository.findByProjectAndWorker = vi.fn(async () => makeRow({ status: 'REJECTED' }))
    const service = createProjectWorkersService({ repository, projectsService, notify })
    await service.invite('proj-1', { workerUserId: 'worker-1' }, owner)
    expect(repository.resetToPending).toHaveBeenCalled()
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('accepts a pending invite', async () => {
    repository.respond = vi.fn(async () =>
      makeRow({ status: 'ACCEPTED', respondedAt: '2026-01-03T00:00:00.000Z' }),
    )
    repository.findWorkerProject = vi
      .fn()
      .mockResolvedValueOnce(makeMine({ status: 'PENDING' }))
      .mockResolvedValueOnce(makeMine({ status: 'ACCEPTED' }))
    const service = createProjectWorkersService({ repository, projectsService, notify })
    const result = await service.accept('proj-1', worker)
    expect(result.status).toBe('ACCEPTED')
    expect(notify.notify).toHaveBeenCalled()
  })

  it('rejects a pending invite and returns REJECTED summary', async () => {
    repository.respond = vi.fn(async () =>
      makeRow({ status: 'REJECTED', respondedAt: '2026-01-03T00:00:00.000Z' }),
    )
    repository.findWorkerProject = vi.fn(async () => makeMine({ status: 'PENDING' }))
    const service = createProjectWorkersService({ repository, projectsService, notify })
    const result = await service.reject('proj-1', worker)
    expect(result.status).toBe('REJECTED')
  })

  it('deletes assignment on remove', async () => {
    const service = createProjectWorkersService({ repository, projectsService, notify })
    await service.remove('proj-1', 'pw-1', owner)
    expect(repository.deleteById).toHaveBeenCalledWith('pw-1')
  })
})
