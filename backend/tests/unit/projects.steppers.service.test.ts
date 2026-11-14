import { beforeEach, describe, expect, it, vi } from 'vitest'

import { forbidden } from '../../src/errors/app-error.js'
import {
  MAX_PROJECT_STEP_INPUTS,
  type ProjectSteppersRepository,
} from '../../src/modules/projects/projects.steppers.repository.js'
import {
  createProjectSteppersService,
  type ProjectSteppersFilesGateway,
} from '../../src/modules/projects/projects.steppers.service.js'

const owner = { id: 'pm-1', roles: ['MANAGER'] }

describe('projectSteppersService', () => {
  let repository: ProjectSteppersRepository
  const projectsService = {
    assertAccessible: vi.fn(async () => ({ id: 'proj-1' }) as never),
  }
  const inputTypes = {
    requireActiveInputType: vi.fn(),
  }
  const files: ProjectSteppersFilesGateway = {
    requireReadyAttachment: vi.fn(),
    softDelete: vi.fn(),
  }
  const categories = {
    requirePlatformCategory: vi.fn(),
  }
  const listings = {
    getListingSnapshot: vi.fn(),
    getListingSnapshots: vi.fn(async () => []),
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
      updateInput: vi.fn(),
      deleteInput: vi.fn(),
    }
  })

  function createService() {
    return createProjectSteppersService(
      repository,
      projectsService,
      inputTypes,
      files,
      categories,
      listings,
    )
  }

  it('allows deleting template-cloned inputs', async () => {
    vi.mocked(repository.findInput).mockResolvedValue({
      id: 'in-1',
      isProjectOnly: false,
      categoryId: null,
      inputTypeCode: 'TEXT',
      value: null,
    })
    vi.mocked(repository.deleteInput).mockResolvedValue(undefined)
    const service = createService()

    await expect(service.removeInput('proj-1', 'step-1', 'in-1', owner)).resolves.toBeUndefined()
    expect(repository.deleteInput).toHaveBeenCalledWith('in-1', 'step-1')
  })

  it('allows deleting project-only inputs', async () => {
    vi.mocked(repository.findInput).mockResolvedValue({
      id: 'in-2',
      isProjectOnly: true,
      categoryId: null,
      inputTypeCode: 'TEXT',
      value: null,
    })
    vi.mocked(repository.deleteInput).mockResolvedValue(undefined)
    const service = createService()

    await expect(service.removeInput('proj-1', 'step-1', 'in-2', owner)).resolves.toBeUndefined()
    expect(repository.deleteInput).toHaveBeenCalledWith('in-2', 'step-1')
  })

  it('soft-deletes attached FILE when removing a FILE input', async () => {
    vi.mocked(repository.findInput).mockResolvedValue({
      id: 'in-file',
      isProjectOnly: true,
      categoryId: null,
      inputTypeCode: 'FILE',
      value: {
        id: 'file-old',
        originalName: 'old.pdf',
        mime: 'application/pdf',
        size: 10,
      },
    })
    vi.mocked(repository.deleteInput).mockResolvedValue(undefined)
    vi.mocked(files.softDelete).mockResolvedValue({} as never)
    const service = createService()

    await service.removeInput('proj-1', 'step-1', 'in-file', owner)

    expect(repository.deleteInput).toHaveBeenCalledWith('in-file', 'step-1')
    expect(files.softDelete).toHaveBeenCalledWith(owner, 'file-old')
  })

  it('rejects listing when steppers exceed the hard cap', async () => {
    vi.mocked(repository.listByProject).mockResolvedValue({
      items: [],
      total: 101,
      truncated: true,
    })
    const service = createService()

    await expect(service.listSteppers('proj-1', owner)).rejects.toMatchObject({
      status: 409,
      code: 'PROJECT_STEPPERS_LIMIT',
    })
  })

  it('resolves FILE values to a file snapshot for the project', async () => {
    vi.mocked(repository.listInputMeta).mockResolvedValue({
      items: [
        {
          id: 'in-file',
          inputTypeCode: 'FILE',
          label: 'Permit scan',
          categoryId: null,
          value: null,
        },
      ],
      truncated: false,
    })
    vi.mocked(files.requireReadyAttachment).mockResolvedValue({
      id: 'file-1',
      key: 'k',
      bucket: 'b',
      mime: 'application/pdf',
      size: 1200,
      originalName: 'permit.pdf',
      status: 'READY',
      uploadedById: 'pm-1',
      entityType: 'PROJECT',
      entityId: 'proj-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(repository.upsertValues).mockResolvedValue(undefined)
    vi.mocked(repository.getDetail).mockResolvedValue({
      detail: {
        id: 'step-1',
        projectId: 'proj-1',
        name: 'Permits',
        orderNb: 0,
        inputs: [],
      },
      truncated: false,
    })
    const service = createService()

    await service.saveValues(
      'proj-1',
      'step-1',
      { values: [{ id: 'in-file', value: 'file-1' }] },
      owner,
    )

    expect(files.requireReadyAttachment).toHaveBeenCalledWith('file-1', 'PROJECT', 'proj-1')
    expect(repository.upsertValues).toHaveBeenCalledWith('step-1', [
      {
        id: 'in-file',
        value: {
          id: 'file-1',
          originalName: 'permit.pdf',
          mime: 'application/pdf',
          size: 1200,
        },
      },
    ])
    expect(files.softDelete).not.toHaveBeenCalled()
  })

  it('soft-deletes the previous FILE when replacing', async () => {
    vi.mocked(repository.listInputMeta).mockResolvedValue({
      items: [
        {
          id: 'in-file',
          inputTypeCode: 'FILE',
          label: 'Permit scan',
          categoryId: null,
          value: {
            id: 'file-old',
            originalName: 'old.pdf',
            mime: 'application/pdf',
            size: 10,
          },
        },
      ],
      truncated: false,
    })
    vi.mocked(files.requireReadyAttachment).mockResolvedValue({
      id: 'file-new',
      key: 'k2',
      bucket: 'b',
      mime: 'image/jpeg',
      size: 200,
      originalName: 'new.jpg',
      status: 'READY',
      uploadedById: 'pm-1',
      entityType: 'PROJECT',
      entityId: 'proj-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(files.softDelete).mockResolvedValue({} as never)
    vi.mocked(repository.upsertValues).mockResolvedValue(undefined)
    vi.mocked(repository.getDetail).mockResolvedValue({
      detail: {
        id: 'step-1',
        projectId: 'proj-1',
        name: 'Permits',
        orderNb: 0,
        inputs: [],
      },
      truncated: false,
    })
    const service = createService()

    await service.saveValues(
      'proj-1',
      'step-1',
      { values: [{ id: 'in-file', value: 'file-new' }] },
      owner,
    )

    expect(files.softDelete).toHaveBeenCalledWith(owner, 'file-old')
  })

  it('rejects FILE values when the attachment is not ready for the project', async () => {
    vi.mocked(repository.listInputMeta).mockResolvedValue({
      items: [
        {
          id: 'in-file',
          inputTypeCode: 'FILE',
          label: 'Permit scan',
          categoryId: null,
          value: null,
        },
      ],
      truncated: false,
    })
    vi.mocked(files.requireReadyAttachment).mockRejectedValue(
      forbidden('File does not belong to this resource'),
    )
    const service = createService()

    await expect(
      service.saveValues(
        'proj-1',
        'step-1',
        { values: [{ id: 'in-file', value: 'file-other' }] },
        owner,
      ),
    ).rejects.toMatchObject({ status: 403 })
    expect(repository.upsertValues).not.toHaveBeenCalled()
  })

  it('clears FILE values when null is sent and soft-deletes the previous file', async () => {
    vi.mocked(repository.listInputMeta).mockResolvedValue({
      items: [
        {
          id: 'in-file',
          inputTypeCode: 'FILE',
          label: 'Permit scan',
          categoryId: null,
          value: {
            id: 'file-old',
            originalName: 'old.pdf',
            mime: 'application/pdf',
            size: 10,
          },
        },
      ],
      truncated: false,
    })
    vi.mocked(files.softDelete).mockResolvedValue({} as never)
    vi.mocked(repository.upsertValues).mockResolvedValue(undefined)
    vi.mocked(repository.getDetail).mockResolvedValue({
      detail: {
        id: 'step-1',
        projectId: 'proj-1',
        name: 'Permits',
        orderNb: 0,
        inputs: [],
      },
      truncated: false,
    })
    const service = createService()

    await service.saveValues(
      'proj-1',
      'step-1',
      { values: [{ id: 'in-file', value: null }] },
      owner,
    )

    expect(files.requireReadyAttachment).not.toHaveBeenCalled()
    expect(repository.upsertValues).toHaveBeenCalledWith('step-1', [{ id: 'in-file', value: null }])
    expect(files.softDelete).toHaveBeenCalledWith(owner, 'file-old')
  })

  it('resolves CATEGORY values to a listing snapshot for the bound category', async () => {
    vi.mocked(repository.listInputMeta).mockResolvedValue({
      items: [
        {
          id: 'in-cat',
          inputTypeCode: 'CATEGORY',
          label: 'Cement product',
          categoryId: 'cat-1',
          value: null,
        },
      ],
      truncated: false,
    })
    listings.getListingSnapshot.mockResolvedValue({
      id: 'list-1',
      name: 'Portland 42.5',
      type: 'MATERIAL',
      categoryId: 'cat-1',
      brand: null,
      unit: 'bag',
      currency: 'USD',
      price: '12',
      priceMin: null,
      priceMax: null,
      rentalPrice: null,
      rentalUnit: null,
      providerId: 'prov-1',
      status: 'ACTIVE',
      description: null,
    })
    vi.mocked(repository.upsertValues).mockResolvedValue(undefined)
    vi.mocked(repository.getDetail).mockResolvedValue({
      detail: {
        id: 'step-1',
        projectId: 'proj-1',
        name: 'Foundation',
        orderNb: 0,
        inputs: [],
      },
      truncated: false,
    })
    const service = createService()

    await service.saveValues(
      'proj-1',
      'step-1',
      { values: [{ id: 'in-cat', value: 'list-1' }] },
      owner,
    )

    expect(listings.getListingSnapshot).toHaveBeenCalledWith('list-1')
    expect(repository.upsertValues).toHaveBeenCalledWith('step-1', [
      {
        id: 'in-cat',
        value: expect.objectContaining({ id: 'list-1', categoryId: 'cat-1', status: 'ACTIVE' }),
      },
    ])
  })

  it('rejects CATEGORY values when the listing category does not match', async () => {
    vi.mocked(repository.listInputMeta).mockResolvedValue({
      items: [
        {
          id: 'in-cat',
          inputTypeCode: 'CATEGORY',
          label: 'Cement product',
          categoryId: 'cat-1',
          value: null,
        },
      ],
      truncated: false,
    })
    listings.getListingSnapshot.mockResolvedValue({
      id: 'list-2',
      name: 'Rebar',
      type: 'MATERIAL',
      categoryId: 'cat-other',
      brand: null,
      unit: 'ton',
      currency: 'USD',
      price: '100',
      priceMin: null,
      priceMax: null,
      rentalPrice: null,
      rentalUnit: null,
      providerId: 'prov-1',
      status: 'ACTIVE',
      description: null,
    })
    const service = createService()

    await expect(
      service.saveValues(
        'proj-1',
        'step-1',
        { values: [{ id: 'in-cat', value: 'list-2' }] },
        owner,
      ),
    ).rejects.toMatchObject({ status: 400 })
    expect(repository.upsertValues).not.toHaveBeenCalled()
  })

  it('adds a project-only TEXT input', async () => {
    vi.mocked(repository.countInputs).mockResolvedValue(1)
    vi.mocked(repository.listUsedOrders).mockResolvedValue([])
    vi.mocked(inputTypes.requireActiveInputType).mockResolvedValue({
      id: 'type-text',
      code: 'TEXT',
      label: 'Text',
    })
    vi.mocked(repository.createInput).mockResolvedValue({
      id: 'in-new',
      label: 'Extra note',
      orderNb: 0,
      inputTypeId: 'type-text',
      inputTypeCode: 'TEXT',
      inputTypeLabel: 'Text',
      categoryId: null,
      value: 'hello',
      isProjectOnly: true,
    })
    const service = createService()

    const result = await service.addInput(
      'proj-1',
      'step-1',
      { label: 'Extra note', inputTypeId: 'type-text', value: 'hello' },
      owner,
    )

    expect(result.data).toMatchObject({
      id: 'in-new',
      label: 'Extra note',
      isProjectOnly: true,
      value: 'hello',
    })
    expect(repository.createInput).toHaveBeenCalled()
  })

  it('requires a platform category when adding a CATEGORY input', async () => {
    vi.mocked(repository.countInputs).mockResolvedValue(0)
    vi.mocked(repository.listUsedOrders).mockResolvedValue([])
    vi.mocked(inputTypes.requireActiveInputType).mockResolvedValue({
      id: 'type-cat',
      code: 'CATEGORY',
      label: 'Category listing',
    })
    categories.requirePlatformCategory.mockResolvedValue({
      id: 'cat-1',
      isActive: true,
    })
    vi.mocked(repository.createInput).mockResolvedValue({
      id: 'in-cat',
      label: 'Product',
      orderNb: 0,
      inputTypeId: 'type-cat',
      inputTypeCode: 'CATEGORY',
      inputTypeLabel: 'Category listing',
      categoryId: 'cat-1',
      value: null,
      isProjectOnly: true,
    })
    const service = createService()

    await expect(
      service.addInput('proj-1', 'step-1', { label: 'Product', inputTypeId: 'type-cat' }, owner),
    ).rejects.toMatchObject({ status: 400 })

    const created = await service.addInput(
      'proj-1',
      'step-1',
      { label: 'Product', inputTypeId: 'type-cat', categoryId: 'cat-1' },
      owner,
    )
    expect(created.data.categoryId).toBe('cat-1')
    expect(categories.requirePlatformCategory).toHaveBeenCalledWith('cat-1')
  })

  it('rejects addInput when the hard input cap is reached', async () => {
    vi.mocked(repository.countInputs).mockResolvedValue(MAX_PROJECT_STEP_INPUTS)
    const service = createService()

    await expect(
      service.addInput('proj-1', 'step-1', { label: 'Overflow', inputTypeId: 'type-text' }, owner),
    ).rejects.toMatchObject({
      status: 409,
      code: 'PROJECT_STEP_INPUTS_LIMIT',
    })
  })
})
