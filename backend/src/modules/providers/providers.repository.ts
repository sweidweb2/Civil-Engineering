import { prisma } from '../../database/prisma.js'
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
  findOwnerUser: (id: string) => Promise<ProviderOwnerUser | null>
  findEligibleOwners: (includeUserId?: string | null) => Promise<ProviderOwnerCandidate[]>
  create: (input: CreateProviderBody) => Promise<ProviderRecord>
  update: (id: string, input: UpdateProviderBody) => Promise<ProviderRecord>
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

    async findOwnerUser(id) {
      return prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true, status: true },
      })
    },

    async findEligibleOwners(includeUserId) {
      const users = await prisma.user.findMany({
        where: {
          role: 'PROVIDER',
          status: 'ACTIVE',
          OR: [{ provider: { is: null } }, ...(includeUserId ? [{ id: includeUserId }] : [])],
        },
        orderBy: { email: 'asc' },
        take: 100,
        select: ownerSelect,
      })
      return users.map((user) => ({
        id: user.id,
        email: user.email,
        displayName: ownerDisplayName(user.profile),
      }))
    },

    async create(input) {
      return prisma.provider.create({
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
      })
    },

    async update(id, input) {
      return prisma.provider.update({
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
      })
    },
  }
}
