import { prisma } from '../../database/prisma.js'
import type { FileEntityTypeName } from './files.schema.js'
import type { FileRecord, FileStatusName } from './files.types.js'

export type CreateFileInput = {
  id: string
  key: string
  bucket: string
  mime: string
  size: number
  originalName: string
  uploadedById: string
  entityType: FileEntityTypeName
  entityId: string
}

export type FilesRepository = {
  createPending: (input: CreateFileInput) => Promise<FileRecord>
  findById: (id: string) => Promise<FileRecord | null>
  markReady: (id: string, size: number) => Promise<FileRecord>
  markDeleted: (id: string) => Promise<FileRecord>
}

export function createFilesRepository(): FilesRepository {
  return {
    async createPending(input) {
      return prisma.file.create({
        data: {
          id: input.id,
          key: input.key,
          bucket: input.bucket,
          mime: input.mime,
          size: input.size,
          originalName: input.originalName,
          status: 'PENDING',
          uploadedById: input.uploadedById,
          entityType: input.entityType,
          entityId: input.entityId,
        },
      }) as Promise<FileRecord>
    },

    async findById(id) {
      return prisma.file.findUnique({ where: { id } }) as Promise<FileRecord | null>
    },

    async markReady(id, size) {
      return prisma.file.update({
        where: { id },
        data: { status: 'READY' satisfies FileStatusName, size },
      }) as Promise<FileRecord>
    },

    async markDeleted(id) {
      return prisma.file.update({
        where: { id },
        data: { status: 'DELETED' satisfies FileStatusName },
      }) as Promise<FileRecord>
    },
  }
}
