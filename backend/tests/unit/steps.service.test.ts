import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StepRecord, StepsRepository } from '../../src/modules/steps/steps.repository.js'
import { createStepsService } from '../../src/modules/steps/steps.service.js'

const manager = { id: 'pm-1', roles: ['MANAGER'] }
const client = { id: 'client-1', roles: ['CLIENT'] }

function stepRecord(overrides: Partial<StepRecord> = {}): StepRecord {
  return {
    id: 'step-1',
    name: 'Foundation',
    orderNb: 0,
    status: 'ACTIVE',
    userId: manager.id,
    inputCount: 0,
    createdAt: new Date('2026-10-23T00:00:00.000Z'),
    updatedAt: new Date('2026-10-23T00:00:00.000Z'),
    ...overrides,
  }
}

describe('stepsService', () => {
  let repository: StepsRepository

  beforeEach(() => {
    repository = {
      findMany: vi.fn(),
      countByStatus: vi.fn(),
      findById: vi.fn(),
      listUsedStepOrders: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      assignActiveToProject: vi.fn(),
      listInputs: vi.fn(),
      findInputById: vi.fn(),
      listUsedInputOrders: vi.fn(),
      findActiveInputType: vi.fn(),
      createInput: vi.fn(),
      updateInput: vi.fn(),
      deleteInput: vi.fn(),
    }
  })

  it('forbids clients from listing steps', async () => {
    const service = createStepsService(repository)
    await expect(service.listSteps({ page: 1, limit: 20 }, client)).rejects.toMatchObject({
      status: 403,
    })
  })

  it('lists steps for a manager', async () => {
    vi.mocked(repository.findMany).mockResolvedValue({ items: [stepRecord()], total: 1 })
    vi.mocked(repository.countByStatus).mockResolvedValue({
      activeCount: 1,
      inactiveCount: 0,
      archivedCount: 0,
    })
    const service = createStepsService(repository)

    const result = await service.listSteps({ page: 1, limit: 20 }, manager)
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.name).toBe('Foundation')
    expect(repository.findMany).toHaveBeenCalledWith(manager.id, { page: 1, limit: 20 })
  })

  it('creates a step with a free order', async () => {
    vi.mocked(repository.listUsedStepOrders).mockResolvedValue([0])
    vi.mocked(repository.create).mockResolvedValue(stepRecord({ orderNb: 1, name: 'Structure' }))
    const service = createStepsService(repository)

    const result = await service.createStep({ name: 'Structure' }, manager)
    expect(result.data.orderNb).toBe(1)
    expect(result.meta?.orderAdjusted).toBe(true)
  })

  it('hides other users steps', async () => {
    vi.mocked(repository.findById).mockResolvedValue(stepRecord({ userId: 'other-pm' }))
    const service = createStepsService(repository)

    await expect(service.getStepById('step-1', manager)).rejects.toMatchObject({
      status: 404,
      code: 'STEP_NOT_FOUND',
    })
  })

  it('assigns active templates to a project', async () => {
    vi.mocked(repository.assignActiveToProject).mockResolvedValue(3)
    const service = createStepsService(repository)

    await service.assignActiveToProject('project-1', manager.id)
    expect(repository.assignActiveToProject).toHaveBeenCalledWith('project-1', manager.id)
  })

  it('rejects step inputs when the input type is inactive', async () => {
    vi.mocked(repository.findById).mockResolvedValue(stepRecord())
    vi.mocked(repository.findActiveInputType).mockResolvedValue(null)
    const service = createStepsService(repository)

    await expect(
      service.createStepInput('step-1', { label: 'Note', inputTypeId: 'it-1' }, manager),
    ).rejects.toMatchObject({ status: 400 })
  })
})
