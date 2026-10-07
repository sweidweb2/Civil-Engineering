import { describe, expect, it, vi } from 'vitest'

import { AppError } from '../../src/errors/app-error.js'
import { createFilesService } from '../../src/modules/files/files.service.js'
import type { FilesRepository } from '../../src/modules/files/files.repository.js'
import type { FileRecord } from '../../src/modules/files/files.types.js'
import type { ProjectsService } from '../../src/modules/projects/projects.service.js'
import type { StorageService } from '../../src/storage/storage.service.js'
import { loadTestConfig } from '../helpers/test-config.js'

const actor = { id: 'user-1', roles: ['CLIENT'] }

function pendingFile(overrides: Partial<FileRecord> = {}): FileRecord {
  return {
    id: 'file1',
    key: 'test/users/user-1/2026/09/file1-a.jpg',
    bucket: 'civil-bucket',
    mime: 'image/jpeg',
    size: 1000,
    originalName: 'a.jpg',
    status: 'PENDING',
    uploadedById: 'user-1',
    entityType: 'USER',
    entityId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('filesService', () => {
  const config = loadTestConfig()

  function setup(opts?: {
    file?: FileRecord | null
    head?: { contentLength?: number; contentType?: string } | null
  }) {
    const file = opts?.file === undefined ? pendingFile() : opts.file
    const repository: FilesRepository = {
      createPending: vi.fn(async (input) =>
        pendingFile({
          id: input.id,
          key: input.key,
          mime: input.mime,
          size: input.size,
          originalName: input.originalName,
          uploadedById: input.uploadedById,
          entityType: input.entityType,
          entityId: input.entityId,
        }),
      ),
      findById: vi.fn(async () => file),
      markReady: vi.fn(async (id, size) => pendingFile({ id, size, status: 'READY' })),
      markDeleted: vi.fn(async (id) => pendingFile({ id, status: 'DELETED' })),
    }

    const storage: StorageService = {
      bucket: 'civil-bucket',
      presignPut: vi.fn(async () => 'https://r2.example/put'),
      presignGet: vi.fn(async () => 'https://r2.example/get'),
      headObject: vi.fn(async () =>
        opts?.head === undefined
          ? { contentLength: 1000, contentType: 'image/jpeg' }
          : opts.head,
      ),
      putObject: vi.fn(async () => undefined),
      deleteObject: vi.fn(async () => undefined),
    }

    const projectsService = {
      assertAccessible: vi.fn(async () => {
        throw new AppError('PROJECT_NOT_FOUND', 'Project not found', 404)
      }),
    } as unknown as ProjectsService

    const enqueueDelete = vi.fn(async () => undefined)

    const service = createFilesService({
      repository,
      storage,
      projectsService,
      config,
      enqueueDelete,
    })

    return { service, repository, storage, enqueueDelete }
  }

  it('presigns after self authz for USER entity', async () => {
    const { service, repository, storage } = setup()
    const result = await service.presign(actor, {
      entityType: 'USER',
      entityId: 'user-1',
      mime: 'image/jpeg',
      size: 1000,
      originalName: 'Avatar.JPG',
    })

    expect(result.uploadUrl).toBe('https://r2.example/put')
    expect(result.headers['Content-Type']).toBe('image/jpeg')
    expect(repository.createPending).toHaveBeenCalled()
    expect(storage.presignPut).toHaveBeenCalled()
  })

  it('forbids attaching to another user', async () => {
    const { service } = setup()
    try {
      await service.presign(actor, {
        entityType: 'USER',
        entityId: 'other-user',
        mime: 'image/jpeg',
        size: 100,
        originalName: 'x.jpg',
      })
      expect.unreachable()
    } catch (error) {
      expect((error as AppError).status).toBe(403)
    }
  })

  it('completes when HeadObject matches', async () => {
    const { service, repository } = setup()
    const ready = await service.complete(actor, 'file1')
    expect(ready.status).toBe('READY')
    expect(repository.markReady).toHaveBeenCalledWith('file1', 1000)
  })

  it('rejects complete when object missing', async () => {
    const { service } = setup({ head: null })
    try {
      await service.complete(actor, 'file1')
      expect.unreachable()
    } catch (error) {
      expect((error as AppError).status).toBe(400)
    }
  })

  it('soft-deletes and enqueues R2 purge', async () => {
    const { service, enqueueDelete } = setup({
      file: pendingFile({ status: 'READY' }),
    })
    await service.softDelete(actor, 'file1')
    expect(enqueueDelete).toHaveBeenCalledWith({
      fileId: 'file1',
      key: 'test/users/user-1/2026/09/file1-a.jpg',
    })
  })
})
