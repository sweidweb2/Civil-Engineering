import { prisma } from '../../database/prisma.js'
import { runInTransaction } from '../../database/transaction.js'
import { translateUniqueConflict } from '../../database/unique-conflict.js'
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
      return translateUniqueConflict(async () => {
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
      })
    },

    async update(id, data) {
      const image = await prisma.listingImage.update({
        where: { id },
        data,
      })
      return mapToListingImage(image)
    },

    async setMainAtomic(listingId, imageId, opts) {
      return translateUniqueConflict(async () => {
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
            data: {
              isMain: true,
              ...(opts?.displayOrder !== undefined ? { displayOrder: opts.displayOrder } : {}),
            },
          })
          return mapToListingImage(image)
        })
      })
    },

    async reorderAtomic(listingId, orderedIds) {
      if (orderedIds.length === 0) return
      await runInTransaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM listings WHERE id = ${listingId} FOR UPDATE`
        const values = orderedIds.map((id, index) => Prisma.sql`(${id}, ${index}::int)`)
        await tx.$executeRaw`
          UPDATE listing_images AS li
          SET "displayOrder" = v.ord, "updatedAt" = NOW()
          FROM (VALUES ${Prisma.join(values)}) AS v(id, ord)
          WHERE li.id = v.id AND li."listingId" = ${listingId}
        `
      })
    },

    async delete(id) {
      await prisma.listingImage.delete({ where: { id } })
    },

    async deleteAndPromoteMain(imageId, listingId) {
      await runInTransaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM listings WHERE id = ${listingId} FOR UPDATE`
        await tx.listingImage.delete({ where: { id: imageId } })
        const next = await tx.listingImage.findFirst({
          where: { listingId },
          orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
          select: { id: true },
        })
        if (!next) return
        await tx.listingImage.updateMany({
          where: { listingId, isMain: true },
          data: { isMain: false },
        })
        await tx.listingImage.update({
          where: { id: next.id },
          data: { isMain: true },
        })
      })
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
