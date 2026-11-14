import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  InputTypeRecord,
  InputTypesRepository,
} from '../../src/modules/input-types/input-types.repository.js'
import { createInputTypesService } from '../../src/modules/input-types/input-types.service.js'

const superActor = { id: 'super-1', roles: ['SUPER'] }
const managerActor = { id: 'pm-1', roles: ['MANAGER'] }

function record(overrides: Partial<InputTypeRecord> = {}): InputTypeRecord {
  return {
    id: 'it-1',
    code: 'TEXT',
    label: 'Text',
    status: 'ACTIVE',
    sortOrder: 10,
    usageCount: 0,
    createdAt: new Date('2026-10-23T00:00:00.000Z'),
    updatedAt: new Date('2026-10-23T00:00:00.000Z'),
    ...overrides,
  }
}

describe('inputTypesService', () => {
  let repository: InputTypesRepository

  beforeEach(() => {
    repository = {
      findMany: vi.fn(),
      countByStatus: vi.fn(),
      findById: vi.fn(),
      findActiveById: vi.fn(),
      findByCode: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
  })

  it('lists only active types for non-super actors without usage joins', async () => {
    vi.mocked(repository.findMany).mockResolvedValue({ items: [record()], total: 1 })
    vi.mocked(repository.countByStatus).mockResolvedValue({ activeCount: 1, inactiveCount: 2 })
    const service = createInputTypesService(repository)

    const result = await service.listInputTypes({ page: 1, limit: 20 }, managerActor)
    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE' }),
      { includeUsage: false },
    )
    expect(repository.countByStatus).not.toHaveBeenCalled()
    expect(result.meta.activeCount).toBe(1)
    expect(result.meta.inactiveCount).toBe(0)
  })

  it('includes usage counts for super when requested', async () => {
    vi.mocked(repository.findMany).mockResolvedValue({
      items: [record({ usageCount: 3 })],
      total: 1,
    })
    vi.mocked(repository.countByStatus).mockResolvedValue({ activeCount: 1, inactiveCount: 2 })
    const service = createInputTypesService(repository)

    const result = await service.listInputTypes(
      { page: 1, limit: 20, includeUsage: true },
      superActor,
    )
    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
      { includeUsage: true },
    )
    expect(repository.countByStatus).toHaveBeenCalled()
    expect(result.data[0]?.usageCount).toBe(3)
    expect(result.meta.inactiveCount).toBe(2)
  })

  it('forbids non-super from creating input types', async () => {
    const service = createInputTypesService(repository)
    await expect(
      service.createInputType({ code: 'DATE', label: 'Date' }, managerActor),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('creates an input type for super', async () => {
    vi.mocked(repository.findByCode).mockResolvedValue(null)
    vi.mocked(repository.create).mockResolvedValue(record({ code: 'DATE', label: 'Date' }))
    const service = createInputTypesService(repository)

    const created = await service.createInputType({ code: 'date', label: 'Date' }, superActor)
    expect(created.code).toBe('DATE')
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'DATE', label: 'Date' }),
    )
  })

  it('rejects duplicate codes', async () => {
    vi.mocked(repository.findByCode).mockResolvedValue(record())
    const service = createInputTypesService(repository)

    await expect(
      service.createInputType({ code: 'TEXT', label: 'Text' }, superActor),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('hides inactive types from non-super getById', async () => {
    vi.mocked(repository.findById).mockResolvedValue(record({ status: 'INACTIVE' }))
    const service = createInputTypesService(repository)

    await expect(service.getInputTypeById('it-1', managerActor)).rejects.toMatchObject({
      status: 404,
    })
  })

  it('requireActiveInputType returns the lean ACTIVE ref', async () => {
    vi.mocked(repository.findActiveById).mockResolvedValue({
      id: 'it-1',
      code: 'TEXT',
      label: 'Text',
    })
    const service = createInputTypesService(repository)

    await expect(service.requireActiveInputType('it-1')).resolves.toEqual({
      id: 'it-1',
      code: 'TEXT',
      label: 'Text',
    })
  })

  it('requireActiveInputType rejects missing or inactive types', async () => {
    vi.mocked(repository.findActiveById).mockResolvedValue(null)
    const service = createInputTypesService(repository)

    await expect(service.requireActiveInputType('it-missing')).rejects.toMatchObject({
      status: 400,
    })
  })
})
