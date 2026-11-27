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
  /** READY only if still PENDING — returns null when raced with delete/complete. */
  markReady: (id: string, size: number) => Promise<FileRecord | null>
  markDeleted: (id: string) => Promise<FileRecord>
  /**
   * Soft-delete live (PENDING/READY) rows of one entity by storage key. Returns the
   * rows that flipped, for R2 cleanup.
   */
  markDeletedByKeys: (
    entityType: FileEntityTypeName,
    entityId: string,
    keys: string[],
  ) => Promise<Array<{ id: string; key: string }>>
  /** Soft-deleted rows still needing R2 cleanup (oldest first). */
  listDeleted: (take: number) => Promise<Array<{ id: string; key: string }>>
  /** Stale PENDING uploads that never completed. */
  listStalePending: (olderThan: Date, take: number) => Promise<Array<{ id: string; key: string }>>
  /**
   * Claim a PENDING row for GC (PENDING → DELETED). Returns null if status changed
   * (e.g. complete() won the race).
   */
  claimStalePending: (id: string) => Promise<{ id: string; key: string } | null>
  /** Remove DB row after successful R2 delete (DELETED only). */
  hardDeleteIfDeleted: (id: string) => Promise<void>
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
      const result = await prisma.file.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'READY' satisfies FileStatusName, size },
      })
      if (result.count === 0) return null
      return prisma.file.findUnique({ where: { id } }) as Promise<FileRecord | null>
    },

    async markDeleted(id) {
      return prisma.file.update({
        where: { id },
        data: { status: 'DELETED' satisfies FileStatusName },
      }) as Promise<FileRecord>
    },

    async markDeletedByKeys(entityType, entityId, keys) {
      if (keys.length === 0) return []
      const where = {
        entityType,
        entityId,
        key: { in: keys },
        status: { in: ['PENDING', 'READY'] satisfies FileStatusName[] },
      }
      const rows = await prisma.file.findMany({ where, select: { id: true, key: true } })
      if (rows.length === 0) return []
      await prisma.file.updateMany({
        where: { ...where, id: { in: rows.map((row) => row.id) } },
        data: { status: 'DELETED' satisfies FileStatusName },
      })
      return rows
    },

    async listDeleted(take) {
      return prisma.file.findMany({
        where: { status: 'DELETED' },
        orderBy: { updatedAt: 'asc' },
        take,
        select: { id: true, key: true },
      })
    },

    async listStalePending(olderThan, take) {
      return prisma.file.findMany({
        where: { status: 'PENDING', createdAt: { lte: olderThan } },
        orderBy: { createdAt: 'asc' },
        take,
        select: { id: true, key: true },
      })
    },

    async claimStalePending(id) {
      const result = await prisma.file.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'DELETED' satisfies FileStatusName },
      })
      if (result.count === 0) return null
      return prisma.file.findUnique({
        where: { id },
        select: { id: true, key: true },
      })
    },

    async hardDeleteIfDeleted(id) {
      await prisma.file.deleteMany({ where: { id, status: 'DELETED' } })
    },
  }
}
