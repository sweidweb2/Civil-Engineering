import type { AuthActor } from '../../authz/index.js'
import { isAdmin } from '../../authz/index.js'
import type { AppConfig } from '../../config/index.js'
import { forbidden, notFound, unauthorized, validationError } from '../../errors/app-error.js'
import { getRequestLogger } from '../../logging/index.js'
import { resolvePublicOrPresignedUrl, type StorageService } from '../../storage/index.js'
import type { AllowedFileMime } from '../files/files.schema.js'
import type { FilesService } from '../files/files.service.js'
import type { DesignOffersRepository } from './design-offers.repository.js'
import type {
  CreateDesignOfferBody,
  ListDesignOffersQuery,
  UpdateDesignOfferBody,
} from './design-offers.schema.js'
import type { DesignOfferRecord, DesignOfferResponse } from './design-offers.types.js'

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export type DesignOffersService = {
  list: (
    query: ListDesignOffersQuery,
    actor: AuthActor,
  ) => Promise<{
    data: DesignOfferResponse[]
    meta: { page: number; limit: number; total: number }
  }>
  getById: (id: string, actor: AuthActor) => Promise<DesignOfferResponse>
  create: (input: CreateDesignOfferBody, actor: AuthActor) => Promise<DesignOfferResponse>
  update: (
    id: string,
    input: UpdateDesignOfferBody,
    actor: AuthActor,
  ) => Promise<DesignOfferResponse>
  uploadImage: (
    id: string,
    actor: AuthActor,
    file: { mime: AllowedFileMime; originalName: string; body: Buffer },
  ) => Promise<DesignOfferResponse>
  remove: (id: string, actor: AuthActor) => Promise<void>
  /** Active offer lookup for design-request create (no actor needed beyond caller checks). */
  requireActiveOffer: (id: string) => Promise<{ id: string }>
}

export type DesignOffersServiceDeps = {
  repository: DesignOffersRepository
  filesService?: FilesService
  storage?: StorageService
  config?: AppConfig
}

function assertAuthenticated(actor: AuthActor): string {
  if (!actor.id) throw unauthorized()
  return actor.id
}

function assertAdmin(actor: AuthActor): void {
  if (!isAdmin(actor.roles)) throw forbidden('Only admins can manage design offers')
}

export function createDesignOffersService(deps: DesignOffersServiceDeps): DesignOffersService {
  const { repository, filesService, storage, config } = deps

  async function resolveImageUrl(imagePath: string | null): Promise<string | null> {
    if (!imagePath || !storage || !config) return null
    try {
      return await resolvePublicOrPresignedUrl({ config, storage, storagePath: imagePath })
    } catch {
      return null
    }
  }

  async function toResponse(record: DesignOfferRecord): Promise<DesignOfferResponse> {
    return {
      id: record.id,
      title: record.title,
      description: record.description,
      priceStart: record.priceStart,
      priceEnd: record.priceEnd,
      currency: record.currency,
      imagePath: record.imagePath,
      imageUrl: await resolveImageUrl(record.imagePath),
      isActive: record.isActive,
      sortOrder: record.sortOrder,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    }
  }

  async function loadOrThrow(id: string): Promise<DesignOfferRecord> {
    const record = await repository.findById(id)
    if (!record) throw notFound('Design offer not found', 'DESIGN_OFFER_NOT_FOUND')
    return record
  }

  async function deleteStorageKey(key: string | null): Promise<void> {
    if (!key || !storage) return
    try {
      await storage.deleteObject(key)
    } catch (error) {
      getRequestLogger().warn(
        { err: error, key, kind: 'design_offers.delete_object_failed' },
        'failed to delete design offer storage object',
      )
    }
  }

  return {
    async list(query, actor) {
      assertAuthenticated(actor)
      const admin = isAdmin(actor.roles)
      if (!admin && !actor.roles.includes('MANAGER')) {
        throw forbidden('Not allowed to view design offers')
      }
      const activeOnly = admin ? Boolean(query.activeOnly) : true
      const result = await repository.findMany({
        page: query.page,
        limit: query.limit,
        q: query.q,
        activeOnly,
      })
      const data = await Promise.all(result.items.map((item) => toResponse(item)))
      return {
        data,
        meta: { page: query.page, limit: query.limit, total: result.total },
      }
    },

    async getById(id, actor) {
      assertAuthenticated(actor)
      const admin = isAdmin(actor.roles)
      if (!admin && !actor.roles.includes('MANAGER')) {
        throw forbidden('Not allowed to view design offers')
      }
      const record = await loadOrThrow(id)
      if (!admin && !record.isActive) {
        throw notFound('Design offer not found', 'DESIGN_OFFER_NOT_FOUND')
      }
      return toResponse(record)
    },

    async create(input, actor) {
      assertAuthenticated(actor)
      assertAdmin(actor)
      const record = await repository.create({
        title: input.title,
        description: input.description,
        priceStart: input.priceStart,
        priceEnd: input.priceEnd,
        currency: input.currency,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
      })
      return toResponse(record)
    },

    async update(id, input, actor) {
      assertAuthenticated(actor)
      assertAdmin(actor)
      await loadOrThrow(id)

      if (
        (input.priceStart !== undefined && input.priceEnd === undefined) ||
        (input.priceEnd !== undefined && input.priceStart === undefined)
      ) {
        const current = await loadOrThrow(id)
        const priceStart = input.priceStart ?? current.priceStart
        const priceEnd = input.priceEnd ?? current.priceEnd
        if (Number(priceStart) > Number(priceEnd)) {
          throw validationError('priceStart must be less than or equal to priceEnd')
        }
      }

      const record = await repository.update(id, input)
      return toResponse(record)
    },

    async uploadImage(id, actor, file) {
      assertAuthenticated(actor)
      assertAdmin(actor)
      if (!filesService) {
        throw validationError('File uploads are not configured')
      }
      if (!IMAGE_MIMES.has(file.mime)) {
        throw validationError('Offer image must be JPEG, PNG, or WebP')
      }
      const existing = await loadOrThrow(id)
      const uploaded = await filesService.uploadBytes(actor, {
        entityType: 'DESIGN_OFFER',
        entityId: id,
        mime: file.mime,
        originalName: file.originalName,
        body: file.body,
      })
      const record = await repository.updateImagePath(id, uploaded.key)
      if (existing.imagePath && existing.imagePath !== uploaded.key) {
        await deleteStorageKey(existing.imagePath)
      }
      return toResponse(record)
    },

    async remove(id, actor) {
      assertAuthenticated(actor)
      assertAdmin(actor)
      const record = await loadOrThrow(id)
      // Requests keep designOfferId null via onDelete SetNull.
      await repository.delete(id)
      await deleteStorageKey(record.imagePath)
    },

    async requireActiveOffer(id) {
      const record = await repository.findById(id)
      if (!record || !record.isActive) {
        throw notFound('Design offer not found', 'DESIGN_OFFER_NOT_FOUND')
      }
      return { id: record.id }
    },
  }
}
