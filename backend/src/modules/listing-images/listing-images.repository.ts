import { runInTransaction } from '../../database/transaction.js'
import { prisma } from '../../database/prisma.js'
import { validationError } from '../../errors/app-error.js'
import { Prisma } from '../../generated/prisma/client.js'
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

    async createAtomic(data) {
      try {
        return await runInTransaction(async (tx) => {
          await tx.$executeRaw`SELECT id FROM listings WHERE id = ${data.listingId} FOR UPDATE`

          const count = await tx.listingImage.count({ where: { listingId: data.listingId } })
          if (count >= data.maxImages) {
            throw validationError(`Maximum ${data.maxImages} images per listings`)
          }

          let isMain = data.isMain === true
          if (!isMain && data.autoMainIfEmpty && count === 0) {
            isMain = true
          }

          if (isMain) {
            await tx.listingImage.updateMany({
              where: { listingId: data.listingId, isMain: true },
              data: { isMain: false },
            })
          }

          const image = await tx.listingImage.create({
            data: {
              listingId: data.listingId,
              storagePath: data.storagePath,
              isMain,
              displayOrder: data.displayOrder ?? count,
            },
          })
          return mapToListingImage(image)
        })
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw validationError('Only one main image is allowed per listing')
        }
        throw error
      }
    },

    async update(id, data) {
      const image = await prisma.listingImage.update({
        where: { id },
        data,
      })
      return mapToListingImage(image)
    },

    async setMainAtomic(listingId, imageId) {
      try {
        return await runInTransaction(async (tx) => {
          await tx.$executeRaw`SELECT id FROM listings WHERE id = ${listingId} FOR UPDATE`
          const existing = await tx.listingImage.findFirst({
            where: { id: imageId, listingId },
          })
          if (!existing) {
            throw validationError('Image does not belong to this listing')
          }
          await tx.listingImage.updateMany({
            where: { listingId, isMain: true },
            data: { isMain: false },
          })
          const image = await tx.listingImage.update({
            where: { id: imageId },
            data: { isMain: true },
          })
          return mapToListingImage(image)
        })
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw validationError('Only one main image is allowed per listing')
        }
        throw error
      }
    },

    async reorderAtomic(listingId, orderedIds) {
      await runInTransaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM listings WHERE id = ${listingId} FOR UPDATE`
        for (let index = 0; index < orderedIds.length; index += 1) {
          const id = orderedIds[index]
          if (!id) continue
          await tx.listingImage.updateMany({
            where: { id, listingId },
            data: { displayOrder: index },
          })
        }
      })
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
