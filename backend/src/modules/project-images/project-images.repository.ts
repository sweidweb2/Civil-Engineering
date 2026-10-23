import { prisma } from '../../database/prisma.js'
import type {
  ProjectImage,
  ProjectImagesRepository,
} from './project-images.types.js'

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

    async update(id, data) {
      const image = await prisma.projectImage.update({
        where: { id },
        data,
      })
      return mapToProjectImage(image)
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
