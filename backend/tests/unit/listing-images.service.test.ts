import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createListingImagesService } from '../../src/modules/listing-images/listing-images.service.js'
import type {
  ListingImage,
  ListingImagesRepository,
} from '../../src/modules/listing-images/listing-images.types.js'
import type { ListingsService } from '../../src/modules/listings/listings.service.js'
import type { StorageService } from '../../src/storage/storage.service.js'
import { loadTestConfig } from '../helpers/test-config.js'

vi.mock('sharp', () => {
  const chain = {
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn(async () => Buffer.from('webp')),
  }
  return { default: vi.fn(() => chain) }
})

const owner = { id: 'owner-1', roles: ['PROVIDER'] }
const stranger = { id: 'other-1', roles: ['CLIENT'] }

/** Minimal JPEG SOI marker — enough for magic-byte sniffing. */
const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])

function makeImage(overrides: Partial<ListingImage> = {}): ListingImage {
  return {
    id: 'img-1',
    listingId: 'listing-1',
    storagePath: 'listings/listing-1/images/img-1.webp',
    isMain: false,
    displayOrder: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('listingImagesService', () => {
  const config = loadTestConfig()
  let repository: ListingImagesRepository
  let listingsService: Pick<ListingsService, 'assertAccessible' | 'assertManageable'>
  let storage: Pick<StorageService, 'presignGet' | 'putObject' | 'deleteObject'>

  beforeEach(() => {
    repository = {
      findByListingId: vi.fn(async () => [makeImage()]),
      findById: vi.fn(async () => makeImage()),
      countByListingId: vi.fn(async () => 1),
      create: vi.fn(async (data) => makeImage({ ...data, id: 'img-new' })),
      update: vi.fn(async (id, data) => makeImage({ id, ...data })),
      delete: vi.fn(async () => undefined),
      unsetMainImage: vi.fn(async () => undefined),
      findMainImageByListingId: vi.fn(async () => makeImage({ isMain: true })),
    }
    listingsService = {
      assertAccessible: vi.fn(async (_listingId, actor) => {
        if (actor.id !== owner.id && !actor.roles.includes('ADMIN') && !actor.roles.includes('SUPER')) {
          const { forbidden } = await import('../../src/errors/app-error.js')
          throw forbidden('Not your listing')
        }
      }),
      assertManageable: vi.fn(async (_listingId, actor) => {
        if (actor.id !== owner.id && !actor.roles.includes('ADMIN') && !actor.roles.includes('SUPER')) {
          const { forbidden } = await import('../../src/errors/app-error.js')
          throw forbidden('Not your listing')
        }
      }),
    }
    storage = {
      presignGet: vi.fn(async () => 'https://cdn.example/img.webp'),
      putObject: vi.fn(async () => undefined),
      deleteObject: vi.fn(async () => undefined),
    }
  })

  function service() {
    return createListingImagesService({
      repository,
      listingsService: listingsService as ListingsService,
      storage: storage as StorageService,
      config,
    })
  }

  it('lists images for an authorized actor', async () => {
    const images = await service().listListingImages(owner, 'listing-1')
    expect(images).toHaveLength(1)
    expect(images[0]?.url).toContain('https://cdn.example')
  })

  it('forbids unauthorized actors from listing', async () => {
    await expect(service().listListingImages(stranger, 'listing-1')).rejects.toMatchObject({
      status: 403,
    })
  })

  it('rejects invalid upload mime types', async () => {
    await expect(
      service().uploadListingImage(
        owner,
        'listing-1',
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

  it('rejects uploads when the listing is at the image cap', async () => {
    vi.mocked(repository.countByListingId).mockResolvedValue(15)
    await expect(
      service().uploadListingImage(
        owner,
        'listing-1',
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
    const created = await service().uploadListingImage(
      owner,
      'listing-1',
      {
        buffer: jpegBuffer,
        originalname: 'site.jpg',
        mimetype: 'image/jpeg',
        size: 2048,
      },
      { isMain: true },
    )
    expect(repository.unsetMainImage).toHaveBeenCalledWith('listing-1')
    expect(storage.putObject).toHaveBeenCalled()
    expect(created.storagePath).toMatch(/^listings\/listing-1\/images\/.+\.webp$/)
  })

  it('deletes image metadata and storage object', async () => {
    await service().deleteListingImage(owner, 'img-1')
    expect(repository.delete).toHaveBeenCalledWith('img-1')
    expect(storage.deleteObject).toHaveBeenCalledWith('listings/listing-1/images/img-1.webp')
  })

  it('promotes the next image when deleting the main image', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeImage({ isMain: true }))
    vi.mocked(repository.findByListingId).mockResolvedValue([
      makeImage({ id: 'img-2', isMain: false }),
    ])
    await service().deleteListingImage(owner, 'img-1')
    expect(repository.update).toHaveBeenCalledWith('img-2', { isMain: true })
  })
})
