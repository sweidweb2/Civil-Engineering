import { prisma } from '../../database/prisma.js'
import { translateUniqueConflict } from '../../database/unique-conflict.js'
import type { Prisma, ProviderStatus } from '../../generated/prisma/client.js'
import type {
  CreateProviderBody,
  ListProvidersQuery,
  UpdateProviderBody,
} from './providers.schema.js'
import type { ProviderOwnerCandidate, ProviderStatusCounts } from './providers.types.js'

const ownerSelect = {
  id: true,
  email: true,
  profile: { select: { displayName: true, firstName: true, lastName: true } },
} as const

export type ProviderOwnerUser = {
  id: string
  role: string
  status: string
}

export type ProviderRecord = {
  id: string
  ownerUserId: string | null
  name: string
  description: string | null
  logoUrl: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  website: string | null
  address: string | null
  city: string | null
  country: string | null
  lat: number | null
  lng: number | null
  status: ProviderStatus
  createdAt: Date
  updatedAt: Date
  owner: {
    id: string
    email: string
    profile: {
      displayName: string | null
      firstName: string | null
      lastName: string | null
    } | null
  } | null
}

export type ProvidersRepository = {
  findMany: (query: ListProvidersQuery) => Promise<{ items: ProviderRecord[]; total: number }>
  countByStatus: () => Promise<ProviderStatusCounts>
  findById: (id: string) => Promise<ProviderRecord | null>
  findByOwnerUserId: (ownerUserId: string) => Promise<ProviderRecord | null>
  /** Lean lookups for cross-module callers. */
  findIdByOwnerUserId: (ownerUserId: string) => Promise<string | null>
  findOwnerUserIdById: (id: string) => Promise<string | null>
  findOwnerUser: (id: string) => Promise<ProviderOwnerUser | null>
  findEligibleOwners: (query: {
    page: number
    limit: number
    q?: string
    includeUserId?: string | null
  }) => Promise<{ items: ProviderOwnerCandidate[]; total: number }>
  create: (input: CreateProviderBody) => Promise<ProviderRecord>
  update: (id: string, input: UpdateProviderBody) => Promise<ProviderRecord>
  /**
   * CAS logo pointer — only succeeds when logoUrl still equals `expected`.
   * Returns null when a concurrent upload/clear won the race.
   */
  compareAndSetLogo: (
    id: string,
    expected: string | null,
    next: string | null,
  ) => Promise<ProviderRecord | null>
}

function ownerDisplayName(
  profile: { displayName: string | null; firstName: string | null; lastName: string | null } | null,
): string | null {
  if (!profile) return null
  return (
    profile.displayName || [profile.firstName, profile.lastName].filter(Boolean).join(' ') || null
  )
}

export function createProvidersRepository(): ProvidersRepository {
  return {
    async findMany(query) {
      const where: Prisma.ProviderWhereInput = {
        AND: [
          query.status ? { status: query.status } : {},
          query.q
            ? {
                OR: [
                  { name: { contains: query.q, mode: 'insensitive' } },
                  { city: { contains: query.q, mode: 'insensitive' } },
                  { country: { contains: query.q, mode: 'insensitive' } },
                  { email: { contains: query.q, mode: 'insensitive' } },
                  { owner: { email: { contains: query.q, mode: 'insensitive' } } },
                ],
              }
            : {},
        ],
      }
      const skip = (query.page - 1) * query.limit
      const [items, total] = await Promise.all([
        prisma.provider.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: query.limit,
          include: { owner: { select: ownerSelect } },
        }),
        prisma.provider.count({ where }),
      ])
      return { items, total }
    },

    async countByStatus() {
      const groups = await prisma.provider.groupBy({
        by: ['status'],
        _count: { _all: true },
      })
      const counts: ProviderStatusCounts = { PENDING: 0, APPROVED: 0, SUSPENDED: 0 }
      for (const group of groups) {
        counts[group.status] = group._count._all
      }
      return counts
    },

    async findById(id) {
      return prisma.provider.findUnique({
        where: { id },
        include: { owner: { select: ownerSelect } },
      })
    },

    async findByOwnerUserId(ownerUserId) {
      return prisma.provider.findUnique({
        where: { ownerUserId },
        include: { owner: { select: ownerSelect } },
      })
    },

    async findIdByOwnerUserId(ownerUserId) {
      const row = await prisma.provider.findUnique({
        where: { ownerUserId },
        select: { id: true },
      })
      return row?.id ?? null
    },

    async findOwnerUserIdById(id) {
      const row = await prisma.provider.findUnique({
        where: { id },
        select: { ownerUserId: true },
      })
      return row?.ownerUserId ?? null
    },

    async findOwnerUser(id) {
      return prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true, status: true },
      })
    },

    async findEligibleOwners(query) {
      const q = query.q?.trim()
      const where = {
        role: 'PROVIDER' as const,
        status: 'ACTIVE' as const,
        OR: [
          { provider: { is: null } },
          ...(query.includeUserId ? [{ id: query.includeUserId }] : []),
        ],
        ...(q
          ? {
              AND: [
                {
                  OR: [
                    { email: { contains: q, mode: 'insensitive' as const } },
                    {
                      profile: {
                        is: {
                          OR: [
                            { displayName: { contains: q, mode: 'insensitive' as const } },
                            { firstName: { contains: q, mode: 'insensitive' as const } },
                            { lastName: { contains: q, mode: 'insensitive' as const } },
                          ],
                        },
                      },
                    },
                  ],
                },
              ],
            }
          : {}),
      }
      const skip = (query.page - 1) * query.limit
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { email: 'asc' },
          skip,
          take: query.limit,
          select: ownerSelect,
        }),
        prisma.user.count({ where }),
      ])
      return {
        items: users.map((user) => ({
          id: user.id,
          email: user.email,
          displayName: ownerDisplayName(user.profile),
        })),
        total,
      }
    },

    async create(input) {
      return translateUniqueConflict(() =>
        prisma.provider.create({
          data: {
            ownerUserId: input.ownerUserId ?? null,
            name: input.name,
            description: input.description ?? null,
            logoUrl: input.logoUrl ?? null,
            phone: input.phone ?? null,
            whatsapp: input.whatsapp ?? null,
            email: input.email ?? null,
            website: input.website ?? null,
            address: input.address ?? null,
            city: input.city ?? null,
            country: input.country ?? null,
            lat: input.lat ?? null,
            lng: input.lng ?? null,
            status: input.status ?? 'PENDING',
          },
          include: { owner: { select: ownerSelect } },
        }),
      )
    },

    async update(id, input) {
      return translateUniqueConflict(() =>
        prisma.provider.update({
          where: { id },
          data: {
            ownerUserId: input.ownerUserId,
            name: input.name,
            description: input.description,
            logoUrl: input.logoUrl,
            phone: input.phone,
            whatsapp: input.whatsapp,
            email: input.email,
            website: input.website,
            address: input.address,
            city: input.city,
            country: input.country,
            lat: input.lat,
            lng: input.lng,
            status: input.status,
          },
          include: { owner: { select: ownerSelect } },
        }),
      )
    },

    async compareAndSetLogo(id, expected, next) {
      const result = await prisma.provider.updateMany({
        where: { id, logoUrl: expected },
        data: { logoUrl: next },
      })
      if (result.count === 0) return null
      return prisma.provider.findUnique({
        where: { id },
        include: { owner: { select: ownerSelect } },
      })
    },
  }
}
