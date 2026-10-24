import { randomUUID } from 'node:crypto'
import sharp from 'sharp'

import type { AuthActor } from '../../authz/index.js'
import { assertOwnerOrAdmin, isAdmin } from '../../authz/index.js'
import type { AppConfig } from '../../config/index.js'
import { conflict, forbidden, notFound, validationError } from '../../errors/app-error.js'
import { getLogger } from '../../logging/index.js'
import { cacheKeys, readThroughCache } from '../../redis/index.js'
import type { StorageService } from '../../storage/storage.service.js'
import { assertMimeMatchesContent } from '../files/mime-sniff.js'
import type { ProviderRecord, ProvidersRepository } from './providers.repository.js'
import type { CreateProviderBody, ListProvidersQuery, UpdateProviderBody } from './providers.schema.js'
import type {
  PaginatedProviders,
  Provider,
  ProviderOwnerCandidate,
} from './providers.types.js'

const LOGO_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const LOGO_MAX_BYTES = 8 * 1024 * 1024

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
}

export type ProvidersServiceDeps = {
  config?: AppConfig
  storage?: StorageService
}

function ownerFromRecord(record: ProviderRecord): Provider['owner'] {
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

    const publicBase = config.storage?.publicBaseUrl?.replace(/\/$/, '')
    if (publicBase) {
      return `${publicBase}/${logoRef.replace(/^\//, '')}`
    }

    const expiresInSec = config.storage?.downloadUrlTtlSec ?? config.storageDownloadUrlTtlSec
    const cacheTtlSec = Math.max(30, Math.min(expiresInSec - 60, 240))
    try {
      return await readThroughCache(cacheKeys.storagePresignGet(logoRef), cacheTtlSec, () =>
        storage.presignGet({
          key: logoRef,
          expiresInSec,
        }),
      )
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
    async listProviders(query, actor) {
      if (!isAdmin(actor.roles)) {
        throw forbidden('Only admins can list providers')
      }
      const [{ items, total }, statusCounts] = await Promise.all([
        repository.findMany(query),
        repository.countByStatus(),
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
      assertOwnerOrAdmin(actor, provider.ownerUserId)
      return withLogo(provider)
    },

    async createProvider(input, actor) {
      if (!isAdmin(actor.roles)) {
        throw forbidden('Only admins can create providers')
      }

      const owner = await repository.findOwnerUser(input.ownerUserId)
      if (!owner) {
        throw notFound('Owner user not found', 'OWNER_NOT_FOUND')
      }
      if (owner.role !== 'PROVIDER') {
        throw validationError('Owner must have the PROVIDER role')
      }

      const existing = await repository.findByOwnerUserId(owner.id)
      if (existing) {
        throw conflict('This owner already has a provider', 'PROVIDER_OWNER_TAKEN')
      }

      const created = await repository.create(input)
      return toProviderDto(created)
    },

    async updateProvider(id, input, actor) {
      const provider = await loadOrThrow(id)
      assertOwnerOrAdmin(actor, provider.ownerUserId)

      if (input.status !== undefined && !isAdmin(actor.roles)) {
        throw forbidden('Only admins can change provider status')
      }

      const updated = await repository.update(id, input)
      return toProviderDto(updated)
    },

    async uploadLogo(id, file, actor) {
      if (!storage) {
        throw validationError('Storage is not configured')
      }

      const provider = await loadOrThrow(id)
      assertOwnerOrAdmin(actor, provider.ownerUserId)

      if (!LOGO_MIMES.has(file.mimetype)) {
        throw validationError('Brand image must be a JPEG, PNG, or WebP')
      }
      try {
        assertMimeMatchesContent(file.mimetype, file.buffer, { imagesOnly: true })
      } catch {
        throw validationError('File content does not match the declared image type')
      }
      if (file.size <= 0 || file.size > LOGO_MAX_BYTES) {
        throw validationError('Brand image must be between 1 byte and 8 MB')
      }

      const webpBuffer = await sharp(file.buffer).webp({ quality: 85, effort: 4 }).toBuffer()
      const objectId = randomUUID().replace(/-/g, '')
      const key = `providers/${id}/logo/${objectId}.webp`
      await storage.putObject({
        key,
        body: webpBuffer,
        contentType: 'image/webp',
      })

      const previous = provider.logoUrl
      const updated = await repository.update(id, { logoUrl: key })

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
      assertOwnerOrAdmin(actor, provider.ownerUserId)

      const previous = provider.logoUrl
      const updated = await repository.update(id, { logoUrl: null })

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
