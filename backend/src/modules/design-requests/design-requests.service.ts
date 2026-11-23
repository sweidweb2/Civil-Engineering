import type { AuthActor } from '../../authz/index.js'
import { isAdmin } from '../../authz/index.js'
import type { AppConfig } from '../../config/index.js'
import { forbidden, notFound, unauthorized, validationError } from '../../errors/app-error.js'
import { getRequestLogger } from '../../logging/index.js'
import { resolvePublicOrPresignedUrl, type StorageService } from '../../storage/index.js'
import type { FilesService } from '../files/files.service.js'
import type { AllowedFileMime } from '../files/files.schema.js'
import type { NotificationsRepository } from '../notifications/notifications.types.js'
import type {
  CreateDesignRequestBody,
  ListDesignRequestsQuery,
  UpdateDesignRequestStatusBody,
} from './design-requests.schema.js'
import type { DesignRequestsRepository } from './design-requests.repository.js'
import type {
  DesignerContact,
  DesignRequestRecord,
  DesignRequestResponse,
  DesignRequestStatusName,
} from './design-requests.types.js'

const ADMIN_FROM_PENDING: DesignRequestStatusName[] = ['IN_PROGRESS', 'COMPLETED', 'REJECTED']
const ADMIN_FROM_IN_PROGRESS: DesignRequestStatusName[] = ['COMPLETED', 'REJECTED']
const DELETABLE: DesignRequestStatusName[] = ['PENDING', 'CANCELLED', 'COMPLETED', 'REJECTED']

export type DesignRequestsService = {
  getDesignerContact: (actor: AuthActor) => Promise<DesignerContact>
  list: (
    query: ListDesignRequestsQuery,
    actor: AuthActor,
  ) => Promise<{
    data: DesignRequestResponse[]
    meta: { page: number; limit: number; total: number }
  }>
  getById: (id: string, actor: AuthActor) => Promise<DesignRequestResponse>
  create: (
    input: CreateDesignRequestBody,
    actor: AuthActor,
    file?: { mime: AllowedFileMime; originalName: string; body: Buffer },
  ) => Promise<DesignRequestResponse>
  updateStatus: (
    id: string,
    input: UpdateDesignRequestStatusBody,
    actor: AuthActor,
  ) => Promise<DesignRequestResponse>
  uploadRequirementFile: (
    id: string,
    actor: AuthActor,
    file: { mime: AllowedFileMime; originalName: string; body: Buffer },
  ) => Promise<DesignRequestResponse>
  uploadResponseFile: (
    id: string,
    actor: AuthActor,
    file: { mime: AllowedFileMime; originalName: string; body: Buffer },
  ) => Promise<DesignRequestResponse>
  remove: (id: string, actor: AuthActor) => Promise<void>
}

export type DesignRequestsServiceDeps = {
  repository: DesignRequestsRepository
  notifications: NotificationsRepository
  filesService?: FilesService
  storage?: StorageService
  config?: AppConfig
}

function toIso(date: Date): string {
  return date.toISOString()
}

function assertAuthenticated(actor: AuthActor): string {
  if (!actor.id) throw unauthorized()
  return actor.id
}

function canTransition(
  current: DesignRequestStatusName,
  next: DesignRequestStatusName,
  actorIsAdmin: boolean,
): boolean {
  if (current === next) return false
  if (actorIsAdmin) {
    if (current === 'PENDING') return ADMIN_FROM_PENDING.includes(next)
    if (current === 'IN_PROGRESS') return ADMIN_FROM_IN_PROGRESS.includes(next)
    return false
  }
  return current === 'PENDING' && next === 'CANCELLED'
}

export function createDesignRequestsService(
  deps: DesignRequestsServiceDeps,
): DesignRequestsService {
  const { repository, notifications, filesService, storage, config } = deps

  async function resolveFileUrl(storagePath: string | null): Promise<string | null> {
    if (!storagePath || !storage || !config) return null
    try {
      return await resolvePublicOrPresignedUrl({ config, storage, storagePath })
    } catch {
      return null
    }
  }

  async function toResponse(record: DesignRequestRecord): Promise<DesignRequestResponse> {
    const [requirementFileUrl, responseFileUrl] = await Promise.all([
      resolveFileUrl(record.requirementFilePath),
      resolveFileUrl(record.responseFilePath),
    ])
    return {
      id: record.id,
      subject: record.subject,
      description: record.description,
      category: record.category,
      status: record.status,
      neededBy: toIso(record.neededBy),
      requirementFilePath: record.requirementFilePath,
      responseFilePath: record.responseFilePath,
      requirementFileUrl,
      responseFileUrl,
      projectId: record.projectId,
      projectName: record.projectName,
      requestedById: record.requestedById,
      requestedByEmail: record.requestedByEmail,
      requestedByName: record.requestedByName,
      createdAt: toIso(record.createdAt),
      updatedAt: toIso(record.updatedAt),
    }
  }

  function assertCanView(record: DesignRequestRecord, actor: AuthActor): void {
    if (isAdmin(actor.roles)) return
    if (actor.id === record.requestedById) return
    throw forbidden('Not allowed to view this design request')
  }

  async function loadOrThrow(id: string): Promise<DesignRequestRecord> {
    const record = await repository.findById(id)
    if (!record) {
      throw notFound('Design request not found', 'DESIGN_REQUEST_NOT_FOUND')
    }
    return record
  }

  async function notifyAdminsOfCreate(
    senderId: string,
    request: DesignRequestRecord,
  ): Promise<void> {
    try {
      const receiverIds = await repository.listAdminReceiverIds()
      const targets = receiverIds.filter((id) => id !== senderId)
      if (targets.length === 0) return
      await notifications.createMany(
        targets.map((receiverId) => ({
          senderId,
          receiverId,
          type: 'INFO' as const,
          title: 'New design request',
          message: `${request.requestedByName} requested: ${request.subject}`,
        })),
      )
    } catch (error) {
      getRequestLogger().warn(
        { err: error, kind: 'design_requests.notify_admins_failed' },
        'failed to notify admins of design request',
      )
    }
  }

  async function notifyPmOfStatus(
    senderId: string | undefined,
    request: DesignRequestRecord,
    status: DesignRequestStatusName,
  ): Promise<void> {
    if (status !== 'COMPLETED' && status !== 'REJECTED') return
    try {
      await notifications.create({
        senderId: senderId ?? null,
        receiverId: request.requestedById,
        type: status === 'COMPLETED' ? 'SUCCESS' : 'WARNING',
        title: status === 'COMPLETED' ? 'Design request completed' : 'Design request rejected',
        message:
          status === 'COMPLETED'
            ? `Your design request "${request.subject}" was completed.`
            : `Your design request "${request.subject}" was rejected.`,
      })
    } catch (error) {
      getRequestLogger().warn(
        { err: error, kind: 'design_requests.notify_pm_failed' },
        'failed to notify PM of design request status',
      )
    }
  }

  async function deleteStorageKey(key: string | null): Promise<void> {
    if (!key || !storage) return
    try {
      await storage.deleteObject(key)
    } catch (error) {
      getRequestLogger().warn(
        { err: error, key, kind: 'design_requests.delete_object_failed' },
        'failed to delete design request storage object',
      )
    }
  }

  return {
    async getDesignerContact(actor) {
      assertAuthenticated(actor)
      const contact = await repository.findDesignerContact()
      if (!contact) {
        throw notFound('No designer contact available', 'DESIGNER_CONTACT_NOT_FOUND')
      }
      return contact
    },

    async list(query, actor) {
      const userId = assertAuthenticated(actor)
      const admin = isAdmin(actor.roles)
      const result = await repository.findMany({
        page: query.page,
        limit: query.limit,
        status: query.status,
        projectId: query.projectId,
        requestedById: admin ? undefined : userId,
      })
      const data = await Promise.all(result.items.map((item) => toResponse(item)))
      return {
        data,
        meta: { page: query.page, limit: query.limit, total: result.total },
      }
    },

    async getById(id, actor) {
      assertAuthenticated(actor)
      const record = await loadOrThrow(id)
      assertCanView(record, actor)
      return toResponse(record)
    },

    async create(input, actor, file) {
      const userId = assertAuthenticated(actor)
      if (isAdmin(actor.roles)) {
        throw forbidden('Only project managers can create design requests')
      }
      if (!actor.roles.includes('MANAGER')) {
        throw forbidden('Only project managers can create design requests')
      }

      let projectId: string | null = input.projectId ?? null
      if (projectId) {
        const project = await repository.findOwnedProject(projectId, userId)
        if (!project) {
          throw notFound('Project not found', 'PROJECT_NOT_FOUND')
        }
        if (project.archivedAt) {
          throw validationError('Cannot create a design request for an archived project')
        }
      }

      let record = await repository.create({
        subject: input.subject,
        description: input.description,
        category: input.category,
        neededBy: input.neededBy,
        projectId,
        requestedById: userId,
      })

      if (file) {
        if (!filesService) {
          await repository.delete(record.id)
          throw validationError('File uploads are not available')
        }
        try {
          const uploaded = await filesService.uploadBytes(actor, {
            entityType: 'DESIGN_REQUEST',
            entityId: record.id,
            mime: file.mime,
            originalName: file.originalName,
            body: file.body,
          })
          record = await repository.updateRequirementPath(record.id, uploaded.key)
        } catch (error) {
          await repository.delete(record.id).catch(() => undefined)
          throw error
        }
      }

      void notifyAdminsOfCreate(userId, record)
      return toResponse(record)
    },

    async updateStatus(id, input, actor) {
      const userId = assertAuthenticated(actor)
      const record = await loadOrThrow(id)
      const admin = isAdmin(actor.roles)

      if (!admin && actor.id !== record.requestedById) {
        throw forbidden('Not allowed to update this design request')
      }

      if (!canTransition(record.status, input.status, admin)) {
        throw validationError(`Cannot change status from ${record.status} to ${input.status}`, {
          code: 'DESIGN_REQUEST_INVALID_STATUS',
        })
      }

      if (!admin && input.status === 'CANCELLED' && record.status !== 'PENDING') {
        throw validationError('Only pending requests can be cancelled')
      }

      const updated = await repository.updateStatus(id, input.status)
      if (admin) {
        void notifyPmOfStatus(userId, updated, input.status)
      }
      return toResponse(updated)
    },

    async uploadRequirementFile(id, actor, file) {
      assertAuthenticated(actor)
      if (!filesService) {
        throw validationError('File uploads are not available')
      }

      const record = await loadOrThrow(id)
      if (actor.id !== record.requestedById) {
        throw forbidden('Only the requester can upload a requirement file')
      }
      if (record.status !== 'PENDING') {
        throw validationError('Requirement files can only be attached while the request is pending')
      }
      if (record.requirementFilePath) {
        throw validationError('A requirement file is already attached')
      }

      const uploaded = await filesService.uploadBytes(actor, {
        entityType: 'DESIGN_REQUEST',
        entityId: record.id,
        mime: file.mime,
        originalName: file.originalName,
        body: file.body,
      })
      return toResponse(await repository.updateRequirementPath(record.id, uploaded.key))
    },

    async uploadResponseFile(id, actor, file) {
      assertAuthenticated(actor)
      if (!isAdmin(actor.roles)) {
        throw forbidden('Only admins can upload response files')
      }
      if (!filesService) {
        throw validationError('File uploads are not available')
      }

      const record = await loadOrThrow(id)
      if (record.status !== 'PENDING' && record.status !== 'IN_PROGRESS') {
        throw validationError('Response files can only be uploaded while pending or in progress')
      }

      const previousKey = record.responseFilePath
      const uploaded = await filesService.uploadBytes(actor, {
        entityType: 'DESIGN_REQUEST',
        entityId: record.id,
        mime: file.mime,
        originalName: file.originalName,
        body: file.body,
      })
      const updated = await repository.updateResponsePath(record.id, uploaded.key)
      if (previousKey && previousKey !== uploaded.key) {
        void deleteStorageKey(previousKey)
      }
      return toResponse(updated)
    },

    async remove(id, actor) {
      assertAuthenticated(actor)
      const record = await loadOrThrow(id)
      const admin = isAdmin(actor.roles)

      if (!admin && actor.id !== record.requestedById) {
        throw forbidden('Not allowed to delete this design request')
      }
      if (!DELETABLE.includes(record.status)) {
        throw validationError('Cannot delete a design request while it is in progress')
      }

      await repository.delete(id)
      void deleteStorageKey(record.requirementFilePath)
      void deleteStorageKey(record.responseFilePath)
    },
  }
}
