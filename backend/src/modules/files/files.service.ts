import { randomUUID } from 'node:crypto'

import type { AuthActor } from '../../authz/index.js'
import type { AppConfig } from '../../config/index.js'
import { forbidden, notFound, unauthorized, validationError } from '../../errors/app-error.js'
import { maybePurgeDeletedFileObjects } from '../../jobs/index.js'
import { getRequestLogger } from '../../logging/index.js'
import { buildObjectKey, type StorageService } from '../../storage/index.js'
import type { ProjectsService } from '../projects/index.js'
import { assertCanAttachToEntity, assertCanCompleteUpload } from './files.authz.js'
import type { FilesRepository } from './files.repository.js'
import type { PresignFileBody } from './files.schema.js'
import type { DownloadUrlResult, FileRecord, PresignFileResult } from './files.types.js'
import { assertMimeMatchesContent } from './mime-sniff.js'

export type FilesService = {
  presign: (actor: AuthActor, input: PresignFileBody) => Promise<PresignFileResult>
  complete: (actor: AuthActor, fileId: string) => Promise<FileRecord>
  downloadUrl: (actor: AuthActor, fileId: string) => Promise<DownloadUrlResult>
  softDelete: (actor: AuthActor, fileId: string) => Promise<FileRecord>
  /** READY file attached to entity — used when linking avatars / attachments. */
  requireReadyAttachment: (
    fileId: string,
    entityType: PresignFileBody['entityType'],
    entityId: string,
  ) => Promise<FileRecord>
  /**
   * Trusted uploads: API puts bytes to R2 then marks READY.
   * Avoids browser→R2 CORS (same path as avatars / project gallery).
   */
  uploadBytes: (
    actor: AuthActor,
    input: {
      entityType: PresignFileBody['entityType']
      entityId: string
      mime: string
      originalName: string
      body: Buffer
    },
  ) => Promise<FileRecord>
}

export type FilesServiceDeps = {
  repository: FilesRepository
  storage: StorageService
  projectsService: ProjectsService
  config: AppConfig
  deleteStorageObject: (payload: { fileId: string; key: string }) => Promise<void>
}

export function createFilesService(deps: FilesServiceDeps): FilesService {
  const { repository, storage, projectsService, config, deleteStorageObject } = deps
  const maxBytes = config.storage?.maxBytes ?? config.storageMaxBytes
  const uploadTtl = config.storage?.uploadUrlTtlSec ?? config.storageUploadUrlTtlSec
  const downloadTtl = config.storage?.downloadUrlTtlSec ?? config.storageDownloadUrlTtlSec

  async function loadOrThrow(id: string): Promise<FileRecord> {
    const file = await repository.findById(id)
    if (!file || file.status === 'DELETED') {
      throw notFound('File not found', 'FILE_NOT_FOUND')
    }
    return file
  }

  return {
    async presign(actor, input) {
      if (!actor.id) {
        throw unauthorized()
      }
      if (input.size > maxBytes) {
        throw validationError(`File exceeds max size of ${maxBytes} bytes`)
      }

      await assertCanAttachToEntity(actor, input.entityType, input.entityId, projectsService)

      const fileId = randomUUID().replace(/-/g, '')
      const key = buildObjectKey({
        env: config.env,
        entityType: input.entityType,
        entityId: input.entityId,
        fileId,
        originalName: input.originalName,
      })

      await repository.createPending({
        id: fileId,
        key,
        bucket: storage.bucket,
        mime: input.mime,
        size: input.size,
        originalName: input.originalName.trim(),
        uploadedById: actor.id,
        entityType: input.entityType,
        entityId: input.entityId,
      })

      try {
        const uploadUrl = await storage.presignPut({
          key,
          contentType: input.mime,
          expiresInSec: uploadTtl,
        })

        void maybePurgeDeletedFileObjects()
        return {
          fileId,
          key,
          uploadUrl,
          headers: { 'Content-Type': input.mime },
        }
      } catch (error) {
        // Compensate: no usable upload URL — drop the PENDING row (no R2 object yet).
        await repository.markDeleted(fileId).catch((cleanupError) => {
          getRequestLogger().warn(
            { err: cleanupError, fileId, kind: 'files.presign_compensate_failed' },
            'failed to mark pending file deleted after presign failure',
          )
        })
        throw error
      }
    },

    async complete(actor, fileId) {
      const file = await loadOrThrow(fileId)
      if (file.status === 'READY') {
        return file
      }
      if (file.status !== 'PENDING') {
        throw forbidden('File cannot be completed')
      }

      assertCanCompleteUpload(actor, file.uploadedById)

      const head = await storage.headObject(file.key)
      if (!head) {
        throw validationError('Object not found in storage — upload the file before complete')
      }

      const size = head.contentLength
      if (size == null || size <= 0) {
        throw validationError('Object size is missing or invalid')
      }
      if (size > maxBytes) {
        throw validationError(`Uploaded object exceeds max size of ${maxBytes} bytes`)
      }
      if (file.size != null && size > file.size * 1.05 + 1024) {
        // Allow small encoding variance; reject large surprises vs declared size
        throw validationError('Uploaded object is larger than declared size')
      }
      if (head.contentType && head.contentType.split(';')[0].trim() !== file.mime) {
        throw validationError('Uploaded Content-Type does not match declared MIME')
      }

      const ready = await repository.markReady(file.id, size)
      if (!ready) {
        // Raced with soft-delete / stale PENDING GC.
        throw forbidden('File cannot be completed')
      }
      return ready
    },

    async downloadUrl(actor, fileId) {
      const file = await loadOrThrow(fileId)
      if (file.status !== 'READY') {
        throw notFound('File not ready', 'FILE_NOT_READY')
      }

      await assertCanAttachToEntity(actor, file.entityType, file.entityId, projectsService)

      const downloadUrl = await storage.presignGet({
        key: file.key,
        expiresInSec: downloadTtl,
      })

      return {
        downloadUrl,
        mime: file.mime,
        originalName: file.originalName,
      }
    },

    async softDelete(actor, fileId) {
      const file = await loadOrThrow(fileId)
      await assertCanAttachToEntity(actor, file.entityType, file.entityId, projectsService)

      const deleted = await repository.markDeleted(file.id)
      await deleteStorageObject({ fileId: deleted.id, key: deleted.key })
      void maybePurgeDeletedFileObjects()
      return deleted
    },

    async requireReadyAttachment(fileId, entityType, entityId) {
      const file = await loadOrThrow(fileId)
      if (file.status !== 'READY') {
        throw validationError('File is not ready — complete the upload first')
      }
      if (file.entityType !== entityType || file.entityId !== entityId) {
        throw forbidden('File does not belong to this resource')
      }
      return file
    },

    async uploadBytes(actor, input) {
      if (!actor.id) {
        throw unauthorized()
      }
      const size = input.body.byteLength
      if (size <= 0) {
        throw validationError('File is empty')
      }
      if (size > maxBytes) {
        throw validationError(`File exceeds max size of ${maxBytes} bytes`)
      }

      await assertCanAttachToEntity(actor, input.entityType, input.entityId, projectsService)

      try {
        assertMimeMatchesContent(input.mime, input.body)
      } catch {
        throw validationError('File content does not match the declared MIME type')
      }

      const fileId = randomUUID().replace(/-/g, '')
      const key = buildObjectKey({
        env: config.env,
        entityType: input.entityType,
        entityId: input.entityId,
        fileId,
        originalName: input.originalName,
      })

      // Persist metadata first so any R2 object is always tracked; compensate on failure.
      await repository.createPending({
        id: fileId,
        key,
        bucket: storage.bucket,
        mime: input.mime,
        size,
        originalName: input.originalName.trim(),
        uploadedById: actor.id,
        entityType: input.entityType,
        entityId: input.entityId,
      })

      try {
        await storage.putObject({
          key,
          body: input.body,
          contentType: input.mime,
        })
        const ready = await repository.markReady(fileId, size)
        if (!ready) {
          await deleteStorageObject({ fileId, key }).catch((cleanupError) => {
            getRequestLogger().warn(
              { err: cleanupError, fileId, key, kind: 'files.upload_compensate_failed' },
              'failed to delete storage object after markReady miss',
            )
          })
          throw forbidden('File cannot be completed')
        }
        return ready
      } catch (error) {
        await repository.markDeleted(fileId).catch((cleanupError) => {
          getRequestLogger().warn(
            { err: cleanupError, fileId, kind: 'files.upload_mark_deleted_failed' },
            'failed to mark file deleted after upload failure',
          )
        })
        await deleteStorageObject({ fileId, key }).catch((cleanupError) => {
          getRequestLogger().warn(
            { err: cleanupError, fileId, key, kind: 'files.upload_compensate_failed' },
            'failed to delete storage object after upload failure',
          )
        })
        throw error
      }
    },
  }
}
