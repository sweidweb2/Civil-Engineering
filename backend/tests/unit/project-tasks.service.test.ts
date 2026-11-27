import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProjectTasksRepository } from '../../src/modules/project-tasks/project-tasks.repository.js'
import { createProjectTasksService } from '../../src/modules/project-tasks/project-tasks.service.js'
import type { ProjectTask } from '../../src/modules/project-tasks/project-tasks.types.js'
import type { ProjectWorkersRepository } from '../../src/modules/project-workers/project-workers.repository.js'
import type { WorkerProjectSummary } from '../../src/modules/project-workers/project-workers.types.js'
import type { ProjectsService } from '../../src/modules/projects/index.js'
import type { Project } from '../../src/modules/projects/projects.types.js'

const owner = { id: 'owner-1', roles: ['MANAGER'] }
const worker = { id: 'worker-1', roles: ['WORKER'] }
const other = { id: 'pm-2', roles: ['MANAGER'] }

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Tower A',
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
    ...overrides,
  }
}

function makeTask(overrides: Partial<ProjectTask> = {}): ProjectTask {
  return {
    id: 'task-1',
    projectId: 'proj-1',
    title: 'Pour slab',
    description: null,
    status: 'TODO',
    dueDate: null,
    assigneeProjectWorkerId: 'pw-1',
    createdById: 'owner-1',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    assignee: {
      id: 'pw-1',
      workerUserId: 'worker-1',
      status: 'ACCEPTED',
      displayName: 'Worker One',
      firstName: 'Worker',
      lastName: 'One',
      email: 'w@example.com',
    },
    ...overrides,
  }
}

function makeMine(overrides: Partial<WorkerProjectSummary> = {}): WorkerProjectSummary {
  return {
    projectWorkerId: 'pw-1',
    status: 'ACCEPTED',
    invitedAt: '2026-01-02T00:00:00.000Z',
    respondedAt: '2026-01-03T00:00:00.000Z',
    project: {
      id: 'proj-1',
      name: 'Tower A',
      code: null,
      city: null,
      country: null,
      status: 'IN_PROGRESS',
      startDate: null,
      endDate: null,
      archivedAt: null,
      owner: { id: 'owner-1', displayName: 'Owner', firstName: null, lastName: null },
    },
    ...overrides,
  }
}

describe('projectTasksService', () => {
  let repository: ProjectTasksRepository
  let projectWorkersRepository: ProjectWorkersRepository
  let projectsService: ProjectsService

  beforeEach(() => {
    repository = {
      findManyByProject: vi.fn(async () => ({ rows: [makeTask()], total: 1 })),
      findManyForWorker: vi.fn(async () => ({ rows: [makeTask()], total: 1 })),
      findById: vi.fn(async () => makeTask()),
      findProjectWorker: vi.fn(async () => ({
        id: 'pw-1',
        projectId: 'proj-1',
        status: 'ACCEPTED',
        workerUserId: 'worker-1',
      })),
      create: vi.fn(async () => makeTask()),
      update: vi.fn(async () => makeTask({ status: 'IN_PROGRESS' })),
      updateStatus: vi.fn(async (_id, status) => makeTask({ status })),
      deleteById: vi.fn(async () => undefined),
    }
    projectWorkersRepository = {
      findWorkerProject: vi.fn(async () => makeMine()),
    } as unknown as ProjectWorkersRepository
    projectsService = {
      assertAccessible: vi.fn(async () => makeProject()),
    } as unknown as ProjectsService
  })

  it('creates a task for the project owner', async () => {
    const service = createProjectTasksService({
      repository,
      projectsService,
      projectWorkersRepository,
    })
    const task = await service.create('proj-1', { title: 'Pour slab' }, owner)
    expect(task.title).toBe('Pour slab')
    expect(repository.create).toHaveBeenCalled()
  })

  it('forbids task create by non-owner', async () => {
    const service = createProjectTasksService({
      repository,
      projectsService,
      projectWorkersRepository,
    })
    await expect(service.create('proj-1', { title: 'X' }, other)).rejects.toMatchObject({
      status: 403,
    })
  })

  it('rejects assignee that is not ACCEPTED', async () => {
    repository.findProjectWorker = vi.fn(async () => ({
      id: 'pw-1',
      projectId: 'proj-1',
      status: 'PENDING',
      workerUserId: 'worker-1',
    }))
    const service = createProjectTasksService({
      repository,
      projectsService,
      projectWorkersRepository,
    })
    await expect(
      service.create('proj-1', { title: 'X', assigneeProjectWorkerId: 'pw-1' }, owner),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('allows worker to update status on own task', async () => {
    const service = createProjectTasksService({
      repository,
      projectsService,
      projectWorkersRepository,
    })
    const task = await service.updateMineStatus('proj-1', 'task-1', { status: 'DONE' }, worker)
    expect(task.status).toBe('DONE')
    expect(repository.updateStatus).toHaveBeenCalledWith('task-1', 'DONE')
  })

  it('forbids worker updating another worker task', async () => {
    repository.findById = vi.fn(async () =>
      makeTask({
        assignee: {
          id: 'pw-2',
          workerUserId: 'worker-2',
          status: 'ACCEPTED',
          displayName: 'Other',
          firstName: null,
          lastName: null,
          email: 'o@example.com',
        },
      }),
    )
    const service = createProjectTasksService({
      repository,
      projectsService,
      projectWorkersRepository,
    })
    await expect(
      service.updateMineStatus('proj-1', 'task-1', { status: 'DONE' }, worker),
    ).rejects.toMatchObject({ status: 403 })
  })
})
