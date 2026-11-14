import { prisma } from '../../database/prisma.js'
import { runInTransaction } from '../../database/transaction.js'
import { translateUniqueConflict } from '../../database/unique-conflict.js'
import { validationError } from '../../errors/app-error.js'
import type { ProjectImage, ProjectImagesRepository } from './project-images.types.js'

function mapToProjectImage(row: {
  id: string
  projectId: string
  storagePath: string
  isMain: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}): ProjectImage {
  return {
    id: row.id,
    projectId: row.projectId,
    storagePath: row.storagePath,
    isMain: row.isMain,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function createProjectImagesRepository(): ProjectImagesRepository {
  return {
    async findByProjectId(projectId) {
      const images = await prisma.projectImage.findMany({
        where: { projectId },
        orderBy: { displayOrder: 'asc' },
      })
      return images.map(mapToProjectImage)
    },

    async findById(id) {
      const image = await prisma.projectImage.findUnique({ where: { id } })
      return image ? mapToProjectImage(image) : null
    },

    async countByProjectId(projectId) {
      return prisma.projectImage.count({ where: { projectId } })
    },

    async create(data) {
      const image = await prisma.projectImage.create({
        data: {
          projectId: data.projectId,
          storagePath: data.storagePath,
          isMain: data.isMain ?? false,
          displayOrder: data.displayOrder ?? 0,
        },
      })
      return mapToProjectImage(image)
    },

    async createAtomic(data) {
      return translateUniqueConflict(async () => {
        return await runInTransaction(async (tx) => {
          // Serialize concurrent uploads for this project (count + main flag).
          await tx.$executeRaw`SELECT id FROM projects WHERE id = ${data.projectId} FOR UPDATE`

          const count = await tx.projectImage.count({ where: { projectId: data.projectId } })
          if (count >= data.maxImages) {
            throw validationError(`Maximum ${data.maxImages} images per projects`)
          }

          let isMain = data.isMain === true
          if (!isMain && data.autoMainIfEmpty && count === 0) {
            isMain = true
          }

          if (isMain) {
            await tx.projectImage.updateMany({
              where: { projectId: data.projectId, isMain: true },
              data: { isMain: false },
            })
          }

          const image = await tx.projectImage.create({
            data: {
              projectId: data.projectId,
              storagePath: data.storagePath,
              isMain,
              displayOrder: data.displayOrder ?? count,
            },
          })
          return mapToProjectImage(image)
        })
      })
    },

    async update(id, data) {
      const image = await prisma.projectImage.update({
        where: { id },
        data,
      })
      return mapToProjectImage(image)
    },

    async setMainAtomic(projectId, imageId, opts) {
      return translateUniqueConflict(async () => {
        return await runInTransaction(async (tx) => {
          await tx.$executeRaw`SELECT id FROM projects WHERE id = ${projectId} FOR UPDATE`
          const existing = await tx.projectImage.findFirst({
            where: { id: imageId, projectId },
          })
          if (!existing) {
            throw validationError('Image does not belong to this project')
          }
          await tx.projectImage.updateMany({
            where: { projectId, isMain: true },
            data: { isMain: false },
          })
          const image = await tx.projectImage.update({
            where: { id: imageId },
            data: {
              isMain: true,
              ...(opts?.displayOrder !== undefined ? { displayOrder: opts.displayOrder } : {}),
            },
          })
          return mapToProjectImage(image)
        })
      })
    },

    async reorderAtomic(projectId, orderedIds) {
      await runInTransaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM projects WHERE id = ${projectId} FOR UPDATE`
        for (let index = 0; index < orderedIds.length; index += 1) {
          const id = orderedIds[index]
          if (!id) continue
          await tx.projectImage.updateMany({
            where: { id, projectId },
            data: { displayOrder: index },
          })
        }
      })
    },

    async delete(id) {
      await prisma.projectImage.delete({ where: { id } })
    },

    async unsetMainImage(projectId) {
      await prisma.projectImage.updateMany({
        where: { projectId, isMain: true },
        data: { isMain: false },
      })
    },

    async findMainImageByProjectId(projectId) {
      const image = await prisma.projectImage.findFirst({
        where: { projectId, isMain: true },
      })
      return image ? mapToProjectImage(image) : null
    },
  }
}
