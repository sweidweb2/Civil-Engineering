import type { AuthActor } from '../../authz/index.js'
import { assertOwnerOrAdmin, isAdmin } from '../../authz/index.js'
import { conflict, forbidden, notFound, validationError } from '../../errors/app-error.js'
import type { ProviderRecord,ProvidersRepository } from './providers.repository.js'
import type { CreateProviderBody, ListProvidersQuery, UpdateProviderBody } from './providers.schema.js'
import type {
  PaginatedProviders,
  Provider,
  ProviderOwnerCandidate,
} from './providers.types.js'

export type ProvidersService = {
  listProviders: (query: ListProvidersQuery, actor: AuthActor) => Promise<PaginatedProviders>
  listOwnerCandidates: (actor: AuthActor) => Promise<ProviderOwnerCandidate[]>
  getProviderById: (id: string, actor: AuthActor) => Promise<Provider>
  createProvider: (input: CreateProviderBody, actor: AuthActor) => Promise<Provider>
  updateProvider: (id: string, input: UpdateProviderBody, actor: AuthActor) => Promise<Provider>
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

export function createProvidersService(repository: ProvidersRepository): ProvidersService {
  async function loadOrThrow(id: string): Promise<ProviderRecord> {
    const provider = await repository.findById(id)
    if (!provider) {
      throw notFound('Provider not found', 'PROVIDER_NOT_FOUND')
    }
    return provider
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

    async getProviderById(id, actor) {
      const provider = await loadOrThrow(id)
      assertOwnerOrAdmin(actor, provider.ownerUserId)
      return toProviderDto(provider)
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
  }
}
