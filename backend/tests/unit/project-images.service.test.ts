import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createProjectImagesService } from '../../src/modules/project-images/project-images.service.js'
import type {
  ProjectImage,
  ProjectImagesRepository,
} from '../../src/modules/project-images/project-images.types.js'
import type { ProjectsService } from '../../src/modules/projects/projects.service.js'
import type { StorageService } from '../../src/storage/storage.service.js'
import { loadTestConfig } from '../helpers/test-config.js'

vi.mock('sharp', () => {
  const chain = {
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn(async () => Buffer.from('webp')),
  }
  return { default: vi.fn(() => chain) }
})

const owner = { id: 'owner-1', roles: ['MANAGER'] }
const stranger = { id: 'other-1', roles: ['CLIENT'] }

function makeImage(overrides: Partial<ProjectImage> = {}): ProjectImage {
  return {
    id: 'img-1',
    projectId: 'p1',
    storagePath: 'projects/p1/images/img-1.webp',
    isMain: false,
    displayOrder: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('projectImagesService', () => {
  const config = loadTestConfig()
  let repository: ProjectImagesRepository
  let projectsService: Pick<ProjectsService, 'assertAccessible'>
  let storage: Pick<StorageService, 'presignGet' | 'putObject' | 'deleteObject'>

  beforeEach(() => {
    repository = {
      findByProjectId: vi.fn(async () => [makeImage()]),
      findById: vi.fn(async () => makeImage()),
      countByProjectId: vi.fn(async () => 1),
      create: vi.fn(async (data) => makeImage({ ...data, id: 'img-new' })),
      createAtomic: vi.fn(async (data) => {
        const count = await repository.countByProjectId(data.projectId)
        if (count >= data.maxImages) {
          const { validationError } = await import('../../src/errors/app-error.js')
          throw validationError(`Maximum ${data.maxImages} images per projects`)
        }
        return makeImage({
          projectId: data.projectId,
          storagePath: data.storagePath,
          isMain: data.isMain === true,
          displayOrder: data.displayOrder ?? count,
          id: 'img-new',
        })
      }),
      update: vi.fn(async (id, data) => makeImage({ id, ...data })),
      setMainAtomic: vi.fn(async (projectId, imageId, opts) =>
        makeImage({
          id: imageId,
          projectId,
          isMain: true,
          ...(opts?.displayOrder !== undefined ? { displayOrder: opts.displayOrder } : {}),
        }),
      ),
      reorderAtomic: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      deleteAndPromoteMain: vi.fn(async () => undefined),
      unsetMainImage: vi.fn(async () => undefined),
      findMainImageByProjectId: vi.fn(async () => makeImage({ isMain: true })),
    }
    projectsService = {
      assertAccessible: vi.fn(async (projectId, actor) => {
        if (
          actor.id !== owner.id &&
          !actor.roles.includes('ADMIN') &&
          !actor.roles.includes('SUPER')
        ) {
          const { forbidden } = await import('../../src/errors/app-error.js')
          throw forbidden('Not your project')
        }
        return { id: projectId } as never
      }),
    }
    storage = {
      presignGet: vi.fn(async () => 'https://cdn.example/img.webp'),
      putObject: vi.fn(async () => undefined),
      deleteObject: vi.fn(async () => undefined),
    }
  })

  function service() {
    return createProjectImagesService({
      repository,
      projectsService: projectsService as ProjectsService,
      storage: storage as StorageService,
      config,
    })
  }

  it('lists images for an authorized actor', async () => {
    const images = await service().listProjectImages(owner, 'p1')
    expect(images).toHaveLength(1)
    expect(images[0]?.url).toContain('https://cdn.example')
  })

  it('forbids unauthorized actors from listing', async () => {
    await expect(service().listProjectImages(stranger, 'p1')).rejects.toMatchObject({
      status: 403,
    })
  })

  it('rejects invalid upload mime types', async () => {
    await expect(
      service().uploadProjectImage(
        owner,
        'p1',
        {
          buffer: Buffer.from('x'),
          originalname: 'doc.pdf',
          mimetype: 'application/pdf',
          size: 100,
        },
        {},
      ),
    ).rejects.toMatchObject({ status: 400 })
  })

  /** Minimal JPEG SOI marker — enough for magic-byte sniffing. */
  const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])

  it('rejects uploads when the project is at the image cap', async () => {
    vi.mocked(repository.countByProjectId).mockResolvedValue(15)
    await expect(
      service().uploadProjectImage(
        owner,
        'p1',
        {
          buffer: jpegBuffer,
          originalname: 'site.jpg',
          mimetype: 'image/jpeg',
          size: 100,
        },
        {},
      ),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('uploads a valid image and stores a webp key', async () => {
    const created = await service().uploadProjectImage(
      owner,
      'p1',
      {
        buffer: jpegBuffer,
        originalname: 'site.jpg',
        mimetype: 'image/jpeg',
        size: 2048,
      },
      { isMain: true },
    )
    expect(repository.createAtomic).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p1', isMain: true, maxImages: 15 }),
    )
    expect(storage.putObject).toHaveBeenCalled()
    expect(created.storagePath).toMatch(/^projects\/p1\/images\/.+\.webp$/)
  })

  it('deletes image metadata and storage object', async () => {
    await service().deleteProjectImage(owner, 'img-1')
    expect(repository.delete).toHaveBeenCalledWith('img-1')
    expect(storage.deleteObject).toHaveBeenCalledWith('projects/p1/images/img-1.webp')
  })
})
