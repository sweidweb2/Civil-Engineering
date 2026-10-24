import { prisma } from '../../database/prisma.js'
import type { ListingImage, ListingImagesRepository } from './listing-images.types.js'

function mapToListingImage(row: {
  id: string
  listingId: string
  storagePath: string
  isMain: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}): ListingImage {
  return {
    id: row.id,
    listingId: row.listingId,
    storagePath: row.storagePath,
    isMain: row.isMain,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function createListingImagesRepository(): ListingImagesRepository {
  return {
    async findByListingId(listingId) {
      const images = await prisma.listingImage.findMany({
        where: { listingId },
        orderBy: { displayOrder: 'asc' },
      })
      return images.map(mapToListingImage)
    },

    async findById(id) {
      const image = await prisma.listingImage.findUnique({ where: { id } })
      return image ? mapToListingImage(image) : null
    },

    async countByListingId(listingId) {
      return prisma.listingImage.count({ where: { listingId } })
    },

    async create(data) {
      const image = await prisma.listingImage.create({
        data: {
          listingId: data.listingId,
          storagePath: data.storagePath,
          isMain: data.isMain ?? false,
          displayOrder: data.displayOrder ?? 0,
        },
      })
      return mapToListingImage(image)
    },

    async update(id, data) {
      const image = await prisma.listingImage.update({
        where: { id },
        data,
      })
      return mapToListingImage(image)
    },

    async delete(id) {
      await prisma.listingImage.delete({ where: { id } })
    },

    async unsetMainImage(listingId) {
      await prisma.listingImage.updateMany({
        where: { listingId, isMain: true },
        data: { isMain: false },
      })
    },

    async findMainImageByListingId(listingId) {
      const image = await prisma.listingImage.findFirst({
        where: { listingId, isMain: true },
      })
      return image ? mapToListingImage(image) : null
    },
  }
}
