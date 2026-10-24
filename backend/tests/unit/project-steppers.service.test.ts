import { beforeEach, describe, expect, it, vi } from 'vitest'

import { forbidden } from '../../src/errors/app-error.js'
import type { ProjectSteppersRepository } from '../../src/modules/project-steppers/project-steppers.repository.js'
import {
  createProjectSteppersService,
  type ProjectSteppersFilesGateway,
} from '../../src/modules/project-steppers/project-steppers.service.js'

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
    return createProjectSteppersService(repository, projectsService, inputTypes, files)
  }

  it('blocks deleting template-cloned inputs', async () => {
    vi.mocked(repository.findInput).mockResolvedValue({
      id: 'in-1',
      isProjectOnly: false,
      categoryId: null,
      inputTypeCode: 'TEXT',
      value: null,
    })
    const service = createService()

    await expect(service.removeInput('proj-1', 'step-1', 'in-1', owner)).rejects.toMatchObject({
      status: 403,
      code: 'PROJECT_STEP_INPUT_LOCKED',
    })
    expect(repository.deleteInput).not.toHaveBeenCalled()
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

  it('soft-deletes attached FILE when removing a project-only FILE input', async () => {
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
    expect(repository.upsertValues).toHaveBeenCalledWith('step-1', [
      { id: 'in-file', value: null },
    ])
    expect(files.softDelete).toHaveBeenCalledWith(owner, 'file-old')
  })
})
