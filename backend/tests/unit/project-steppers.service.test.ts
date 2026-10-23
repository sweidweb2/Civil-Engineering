import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProjectSteppersRepository } from '../../src/modules/project-steppers/project-steppers.repository.js'
import { createProjectSteppersService } from '../../src/modules/project-steppers/project-steppers.service.js'

const owner = { id: 'pm-1', roles: ['MANAGER'] }

describe('projectSteppersService', () => {
  let repository: ProjectSteppersRepository
  const projectsService = {
    assertAccessible: vi.fn(async () => ({ id: 'proj-1' }) as never),
  }
  const inputTypes = {
    requireActiveInputType: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    repository = {
      listByProject: vi.fn(),
      findById: vi.fn(async () => ({ id: 'step-1', projectId: 'proj-1' })),
      getDetail: vi.fn(),
      listInputMeta: vi.fn(),
      findInput: vi.fn(),
      upsertValues: vi.fn(),
      listUsedOrders: vi.fn(),
      countInputs: vi.fn(),
      createInput: vi.fn(),
      deleteInput: vi.fn(),
    }
  })

  it('blocks deleting template-cloned inputs', async () => {
    vi.mocked(repository.findInput).mockResolvedValue({ id: 'in-1', isProjectOnly: false })
    const service = createProjectSteppersService(repository, projectsService, inputTypes)

    await expect(service.removeInput('proj-1', 'step-1', 'in-1', owner)).rejects.toMatchObject({
      status: 403,
      code: 'PROJECT_STEP_INPUT_LOCKED',
    })
    expect(repository.deleteInput).not.toHaveBeenCalled()
  })

  it('allows deleting project-only inputs', async () => {
    vi.mocked(repository.findInput).mockResolvedValue({ id: 'in-2', isProjectOnly: true })
    vi.mocked(repository.deleteInput).mockResolvedValue(undefined)
    const service = createProjectSteppersService(repository, projectsService, inputTypes)

    await expect(service.removeInput('proj-1', 'step-1', 'in-2', owner)).resolves.toBeUndefined()
    expect(repository.deleteInput).toHaveBeenCalledWith('in-2', 'step-1')
  })

  it('rejects listing when steppers exceed the hard cap', async () => {
    vi.mocked(repository.listByProject).mockResolvedValue({
      items: [],
      total: 101,
      truncated: true,
    })
    const service = createProjectSteppersService(repository, projectsService, inputTypes)

    await expect(service.listSteppers('proj-1', owner)).rejects.toMatchObject({
      status: 409,
      code: 'PROJECT_STEPPERS_LIMIT',
    })
  })
})
