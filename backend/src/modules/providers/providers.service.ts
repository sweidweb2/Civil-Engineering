import { randomUUID } from 'node:crypto'

import type { AuthActor } from '../../authz/index.js'
import { assertOwnerOrAdmin, isAdmin } from '../../authz/index.js'
import type { AppConfig } from '../../config/index.js'
import {
  conflict,
  forbidden,
  isUniqueConflictError,
  notFound,
  validationError,
} from '../../errors/app-error.js'
import { getLogger } from '../../logging/index.js'
import { resolvePublicOrPresignedUrl, type StorageService } from '../../storage/index.js'
import { assertAllowedImageUpload, MAX_BRAND_IMAGE_BYTES, toWebpBuffer } from '../files/index.js'
import type { ProviderRecord, ProvidersRepository } from './providers.repository.js'
import type {
  CreateProviderBody,
  ListProvidersQuery,
  UpdateProviderBody,
} from './providers.schema.js'
import type {
  PaginatedProviders,
  Provider,
  ProviderOwnerCandidate,
  ProviderStatusCounts,
} from './providers.types.js'

export type ProviderWithLogo = {
  provider: Provider
  logoDownloadUrl: string | null
}

export type ProvidersService = {
  listProviders: (query: ListProvidersQuery, actor: AuthActor) => Promise<PaginatedProviders>
  listOwnerCandidates: (actor: AuthActor) => Promise<ProviderOwnerCandidate[]>
  getMyProvider: (actor: AuthActor) => Promise<ProviderWithLogo>
  getProviderById: (id: string, actor: AuthActor) => Promise<ProviderWithLogo>
  createProvider: (input: CreateProviderBody, actor: AuthActor) => Promise<Provider>
  updateProvider: (id: string, input: UpdateProviderBody, actor: AuthActor) => Promise<Provider>
  uploadLogo: (
    id: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    actor: AuthActor,
  ) => Promise<ProviderWithLogo>
  clearLogo: (id: string, actor: AuthActor) => Promise<ProviderWithLogo>
  /** Internal lookups for other modules (no actor / authorization). */
  findProviderIdByOwnerUserId: (ownerUserId: string) => Promise<string | null>
  findOwnerUserId: (providerId: string) => Promise<string | null>
  countProvidersByStatus: () => Promise<ProviderStatusCounts>
}

export type ProvidersServiceDeps = {
  config?: AppConfig
  storage?: StorageService
}

function ownerFromRecord(record: ProviderRecord): Provider['owner'] {
  if (!record.owner) return null
  const profile = record.owner.profile
  const displayName =
    profile?.displayName ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
    null
  return {
    id: record.owner.id,
    email: record.owner.email,
    displayName,
  }
}

function assertProviderAccess(actor: AuthActor, ownerUserId: string | null) {
  if (isAdmin(actor.roles)) return
  if (!ownerUserId) {
    throw forbidden('You do not own this resource')
  }
  assertOwnerOrAdmin(actor, ownerUserId)
}

async function resolveAssignableOwnerUserId(
  repository: ProvidersRepository,
  ownerUserId: string | null,
  currentProviderId?: string,
): Promise<string | null> {
  if (!ownerUserId) return null

  const owner = await repository.findOwnerUser(ownerUserId)
  if (!owner) {
    throw notFound('Owner user not found', 'OWNER_NOT_FOUND')
  }
  if (owner.role !== 'PROVIDER') {
    throw validationError('Owner must have the PROVIDER role')
  }

  const existing = await repository.findByOwnerUserId(owner.id)
  if (existing && existing.id !== currentProviderId) {
    throw conflict('This owner already has a provider', 'PROVIDER_OWNER_TAKEN')
  }

  return owner.id
}

export function toProviderDto(record: ProviderRecord): Provider {
  return {
    id: record.id,
    ownerUserId: record.ownerUserId,
    name: record.name,
    description: record.description,
    logoUrl: record.logoUrl,
    phone: record.phone,
    whatsapp: record.whatsapp,
    email: record.email,
    website: record.website,
    address: record.address,
    city: record.city,
    country: record.country,
    lat: record.lat,
    lng: record.lng,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    owner: ownerFromRecord(record),
  }
}

export function createProvidersService(
  repository: ProvidersRepository,
  deps: ProvidersServiceDeps = {},
): ProvidersService {
  const { config, storage } = deps

  async function loadOrThrow(id: string): Promise<ProviderRecord> {
    const provider = await repository.findById(id)
    if (!provider) {
      throw notFound('Provider not found', 'PROVIDER_NOT_FOUND')
    }
    return provider
  }

  async function resolveLogoUrl(logoRef: string | null): Promise<string | null> {
    if (!logoRef) return null
    if (/^https?:\/\//i.test(logoRef)) return logoRef
    if (!storage || !config) return null

    try {
      return await resolvePublicOrPresignedUrl({ config, storage, storagePath: logoRef })
    } catch {
      return null
    }
  }

  async function withLogo(record: ProviderRecord): Promise<ProviderWithLogo> {
    const provider = toProviderDto(record)
    return {
      provider,
      logoDownloadUrl: await resolveLogoUrl(provider.logoUrl),
    }
  }

  return {
    findProviderIdByOwnerUserId: (ownerUserId) => repository.findIdByOwnerUserId(ownerUserId),
    findOwnerUserId: (providerId) => repository.findOwnerUserIdById(providerId),
    countProvidersByStatus: () => repository.countByStatus(),

    async listProviders(query, actor) {
      if (!isAdmin(actor.roles)) {
        throw forbidden('Only admins can list providers')
      }
      const [{ items, total }, statusCounts] = await Promise.all([
        repository.findMany(query),
        query.counts === false
          ? Promise.resolve<ProviderStatusCounts>({ PENDING: 0, APPROVED: 0, SUSPENDED: 0 })
          : repository.countByStatus(),
      ])
      return {
        data: items.map(toProviderDto),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          statusCounts,
        },
      }
    },

    async listOwnerCandidates(actor) {
      if (!isAdmin(actor.roles)) {
        throw forbidden('Only admins can list provider owners')
      }
      return repository.findEligibleOwners()
    },

    async getMyProvider(actor) {
      if (!actor.roles.includes('PROVIDER') && !isAdmin(actor.roles)) {
        throw forbidden('Only providers can load their own provider profile')
      }
      const provider = await repository.findByOwnerUserId(actor.id)
      if (!provider) {
        throw notFound('Provider profile not found', 'PROVIDER_NOT_FOUND')
      }
      return withLogo(provider)
    },

    async getProviderById(id, actor) {
      const provider = await loadOrThrow(id)
      assertProviderAccess(actor, provider.ownerUserId)
      return withLogo(provider)
    },

    async createProvider(input, actor) {
      if (!isAdmin(actor.roles)) {
        throw forbidden('Only admins can create providers')
      }

      const ownerUserId = await resolveAssignableOwnerUserId(repository, input.ownerUserId ?? null)
      try {
        const created = await repository.create({ ...input, ownerUserId })
        return toProviderDto(created)
      } catch (error) {
        if (isUniqueConflictError(error)) {
          throw conflict('This owner already has a provider', 'PROVIDER_OWNER_TAKEN')
        }
        throw error
      }
    },

    async updateProvider(id, input, actor) {
      const provider = await loadOrThrow(id)
      assertProviderAccess(actor, provider.ownerUserId)

      if (input.status !== undefined && !isAdmin(actor.roles)) {
        throw forbidden('Only admins can change provider status')
      }

      try {
        if (input.ownerUserId !== undefined) {
          if (!isAdmin(actor.roles)) {
            throw forbidden('Only admins can change provider owner')
          }
          const nextOwnerUserId = await resolveAssignableOwnerUserId(
            repository,
            input.ownerUserId,
            provider.id,
          )
          const updated = await repository.update(id, { ...input, ownerUserId: nextOwnerUserId })
          return toProviderDto(updated)
        }

        const updated = await repository.update(id, input)
        return toProviderDto(updated)
      } catch (error) {
        if (isUniqueConflictError(error)) {
          throw conflict('This owner already has a provider', 'PROVIDER_OWNER_TAKEN')
        }
        throw error
      }
    },

    async uploadLogo(id, file, actor) {
      if (!storage) {
        throw validationError('Storage is not configured')
      }

      const provider = await loadOrThrow(id)
      assertProviderAccess(actor, provider.ownerUserId)

      assertAllowedImageUpload(file, { maxBytes: MAX_BRAND_IMAGE_BYTES })

      const webpBuffer = await toWebpBuffer(file.buffer)
      const objectId = randomUUID().replace(/-/g, '')
      const key = `providers/${id}/logo/${objectId}.webp`
      const previous = provider.logoUrl

      // R2 first so a hang/timeout never leaves the DB pointing at a missing object.
      // CAS then claims the pointer; losers delete their orphan object.
      await storage.putObject({
        key,
        body: webpBuffer,
        contentType: 'image/webp',
      })

      const updated = await repository.compareAndSetLogo(id, previous, key)
      if (!updated) {
        try {
          await storage.deleteObject(key)
        } catch (error) {
          getLogger().error(
            { err: error, providerId: id, storagePath: key },
            'failed to delete orphan provider logo after CAS miss',
          )
        }
        throw conflict('Provider logo was changed by another request', 'PROVIDER_LOGO_CONFLICT')
      }

      if (previous && previous !== key && !/^https?:\/\//i.test(previous)) {
        try {
          await storage.deleteObject(previous)
        } catch (error) {
          getLogger().error(
            { err: error, providerId: id, storagePath: previous },
            'failed to delete previous provider logo',
          )
        }
      }

      return withLogo(updated)
    },

    async clearLogo(id, actor) {
      const provider = await loadOrThrow(id)
      assertProviderAccess(actor, provider.ownerUserId)

      const previous = provider.logoUrl
      const updated = await repository.compareAndSetLogo(id, previous, null)
      if (!updated) {
        throw conflict('Provider logo was changed by another request', 'PROVIDER_LOGO_CONFLICT')
      }

      if (previous && !/^https?:\/\//i.test(previous) && storage) {
        try {
          await storage.deleteObject(previous)
        } catch (error) {
          getLogger().error(
            { err: error, providerId: id, storagePath: previous },
            'failed to delete provider logo from storage',
          )
        }
      }

      return withLogo(updated)
    },
  }
}
