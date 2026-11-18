import { prisma } from '../../database/prisma.js'
import { translateUniqueConflict } from '../../database/unique-conflict.js'
import type { Prisma, WorkerAvailability } from '../../generated/prisma/client.js'
import type { ListWorkersQuery, UpsertWorkerProfileBody } from './workers.schema.js'
import type {
  PaginatedWorkers,
  WorkerAvailabilityCounts,
  WorkerDirectoryItem,
  WorkerProfile,
} from './workers.types.js'

const profileInclude = {
  experiences: { orderBy: { sortOrder: 'asc' as const } },
  education: { orderBy: { sortOrder: 'asc' as const } },
  certifications: { orderBy: { sortOrder: 'asc' as const } },
  skills: {
    include: {
      category: { select: { id: true, name: true, nameAr: true, isActive: true } },
    },
  },
  user: {
    select: {
      id: true,
      email: true,
      status: true,
      verificationStatus: true,
      isVerified: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
          displayName: true,
          phone: true,
          avatarUrl: true,
        },
      },
    },
  },
} as const

type ProfileRow = Prisma.WorkerProfileGetPayload<{ include: typeof profileInclude }>

export type WorkerProfileWriteInput = UpsertWorkerProfileBody

export type ListWorkersFilters = ListWorkersQuery & {
  /** When true, only ACTIVE + VERIFIED + isPublic workers. */
  publicOnly: boolean
}

export type WorkerVerificationState = {
  role: string
  verificationStatus: 'UNVERIFIED' | 'REQUESTED' | 'VERIFIED'
}

export type WorkersRepository = {
  findByUserId: (userId: string) => Promise<WorkerProfile | null>
  findUserRole: (userId: string) => Promise<'WORKER' | string | null>
  findVerificationState: (userId: string) => Promise<WorkerVerificationState | null>
  setVerificationRequested: (userId: string) => Promise<void>
  updateVisibility: (userId: string, isPublic: boolean) => Promise<WorkerProfile>
  ensureProfileWithVisibility: (userId: string, isPublic: boolean) => Promise<WorkerProfile>
  countActiveWorkerCategories: (categoryIds: string[]) => Promise<number>
  upsertWithChildren: (userId: string, input: WorkerProfileWriteInput) => Promise<WorkerProfile>
  deleteByUserId: (userId: string) => Promise<void>
  list: (filters: ListWorkersFilters) => Promise<PaginatedWorkers>
}

function decimalToString(value: { toString(): string } | null): string | null {
  return value == null ? null : value.toString()
}

function dateToIso(value: Date | null): string | null {
  if (!value) return null
  return value.toISOString().slice(0, 10)
}

function mapProfile(row: ProfileRow): WorkerProfile {
  return {
    id: row.id,
    userId: row.userId,
    headline: row.headline,
    bio: row.bio,
    primaryTrade: row.primaryTrade,
    yearsExperience: row.yearsExperience,
    languages: row.languages,
    city: row.city,
    country: row.country,
    hourlyRate: decimalToString(row.hourlyRate),
    dailyRate: decimalToString(row.dailyRate),
    currency: row.currency,
    availability: row.availability,
    isPublic: row.isPublic,
    cvUrl: row.cvUrl,
    experiences: row.experiences.map((item) => ({
      id: item.id,
      company: item.company,
      roleTitle: item.roleTitle,
      projectType: item.projectType,
      location: item.location,
      startDate: dateToIso(item.startDate),
      endDate: dateToIso(item.endDate),
      isCurrent: item.isCurrent,
      description: item.description,
      sortOrder: item.sortOrder,
    })),
    education: row.education.map((item) => ({
      id: item.id,
      school: item.school,
      degree: item.degree,
      field: item.field,
      startYear: item.startYear,
      endYear: item.endYear,
      sortOrder: item.sortOrder,
    })),
    certifications: row.certifications.map((item) => ({
      id: item.id,
      name: item.name,
      issuer: item.issuer,
      issuedAt: dateToIso(item.issuedAt),
      expiresAt: dateToIso(item.expiresAt),
      credentialId: item.credentialId,
      sortOrder: item.sortOrder,
    })),
    skills: row.skills.map((item) => ({
      id: item.id,
      categoryId: item.categoryId,
      categoryName: item.category.name,
      categoryNameAr: item.category.nameAr,
      categoryIsActive: item.category.isActive,
      level: item.level,
    })),
    user: {
      id: row.user.id,
      email: row.user.email,
      status: row.user.status,
      verificationStatus: row.user.verificationStatus,
      isVerified: row.user.isVerified,
      firstName: row.user.profile?.firstName ?? null,
      lastName: row.user.profile?.lastName ?? null,
      displayName: row.user.profile?.displayName ?? null,
      phone: row.user.profile?.phone ?? null,
      avatarUrl: row.user.profile?.avatarUrl ?? null,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function mapDirectoryItem(
  row: Prisma.WorkerProfileGetPayload<{
    include: {
      user: {
        select: {
          verificationStatus: true
          isVerified: true
          profile: {
            select: { firstName: true; lastName: true; displayName: true; avatarUrl: true }
          }
        }
      }
      skills: {
        include: { category: { select: { name: true; isActive: true } } }
        take: 5
      }
    }
  }>,
): WorkerDirectoryItem {
  return {
    id: row.id,
    userId: row.userId,
    headline: row.headline,
    primaryTrade: row.primaryTrade,
    yearsExperience: row.yearsExperience,
    city: row.city,
    country: row.country,
    hourlyRate: decimalToString(row.hourlyRate),
    dailyRate: decimalToString(row.dailyRate),
    currency: row.currency,
    availability: row.availability,
    isPublic: row.isPublic,
    verificationStatus: row.user.verificationStatus,
    isVerified: row.user.isVerified,
    displayName: row.user.profile?.displayName ?? null,
    firstName: row.user.profile?.firstName ?? null,
    lastName: row.user.profile?.lastName ?? null,
    avatarUrl: row.user.profile?.avatarUrl ?? null,
    skillNames: row.skills
      .filter((s) => s.category.isActive)
      .map((s) => s.category.name)
      .slice(0, 5),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function parseDate(value: string | null): Date | null {
  if (!value) return null
  return new Date(`${value}T00:00:00.000Z`)
}

function emptyAvailabilityCounts(): WorkerAvailabilityCounts {
  return { AVAILABLE: 0, BUSY: 0, UNAVAILABLE: 0 }
}

export function createWorkersRepository(): WorkersRepository {
  return {
    async findByUserId(userId) {
      const row = await prisma.workerProfile.findUnique({
        where: { userId },
        include: profileInclude,
      })
      return row ? mapProfile(row) : null
    },

    async findUserRole(userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      })
      return user?.role ?? null
    },

    async findVerificationState(userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, verificationStatus: true },
      })
      if (!user) return null
      return {
        role: user.role,
        verificationStatus: user.verificationStatus,
      }
    },

    async setVerificationRequested(userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          verificationStatus: 'REQUESTED',
          isVerified: false,
        },
      })
    },

    async updateVisibility(userId, isPublic) {
      await prisma.workerProfile.update({
        where: { userId },
        data: { isPublic },
      })
      const row = await prisma.workerProfile.findUniqueOrThrow({
        where: { userId },
        include: profileInclude,
      })
      return mapProfile(row)
    },

    async ensureProfileWithVisibility(userId, isPublic) {
      await prisma.workerProfile.upsert({
        where: { userId },
        create: { userId, isPublic },
        update: { isPublic },
      })
      const row = await prisma.workerProfile.findUniqueOrThrow({
        where: { userId },
        include: profileInclude,
      })
      return mapProfile(row)
    },

    async countActiveWorkerCategories(categoryIds) {
      if (categoryIds.length === 0) return 0
      return prisma.category.count({
        where: {
          id: { in: categoryIds },
          kind: 'WORKER',
          isActive: true,
          scope: 'PLATFORM',
        },
      })
    },

    async upsertWithChildren(userId, input) {
      const scalars = {
        headline: input.headline,
        bio: input.bio,
        primaryTrade: input.primaryTrade,
        yearsExperience: input.yearsExperience,
        languages: input.languages,
        city: input.city,
        country: input.country,
        hourlyRate: input.hourlyRate,
        dailyRate: input.dailyRate,
        currency: input.currency,
        availability: input.availability,
        isPublic: input.isPublic,
        cvUrl: input.cvUrl,
      }

      const row = await translateUniqueConflict(() =>
        prisma.$transaction(async (tx) => {
          const profile = await tx.workerProfile.upsert({
            where: { userId },
            create: { userId, ...scalars },
            update: scalars,
          })

          await tx.workerExperience.deleteMany({ where: { workerProfileId: profile.id } })
          await tx.workerEducation.deleteMany({ where: { workerProfileId: profile.id } })
          await tx.workerCertification.deleteMany({ where: { workerProfileId: profile.id } })
          await tx.workerSkill.deleteMany({ where: { workerProfileId: profile.id } })

          if (input.experiences.length > 0) {
            await tx.workerExperience.createMany({
              data: input.experiences.map((item, index) => ({
                workerProfileId: profile.id,
                company: item.company,
                roleTitle: item.roleTitle,
                projectType: item.projectType,
                location: item.location,
                startDate: parseDate(item.startDate),
                endDate: parseDate(item.endDate),
                isCurrent: item.isCurrent,
                description: item.description,
                sortOrder: item.sortOrder ?? index,
              })),
            })
          }

          if (input.education.length > 0) {
            await tx.workerEducation.createMany({
              data: input.education.map((item, index) => ({
                workerProfileId: profile.id,
                school: item.school,
                degree: item.degree,
                field: item.field,
                startYear: item.startYear,
                endYear: item.endYear,
                sortOrder: item.sortOrder ?? index,
              })),
            })
          }

          if (input.certifications.length > 0) {
            await tx.workerCertification.createMany({
              data: input.certifications.map((item, index) => ({
                workerProfileId: profile.id,
                name: item.name,
                issuer: item.issuer,
                issuedAt: parseDate(item.issuedAt),
                expiresAt: parseDate(item.expiresAt),
                credentialId: item.credentialId,
                sortOrder: item.sortOrder ?? index,
              })),
            })
          }

          if (input.skills.length > 0) {
            await tx.workerSkill.createMany({
              data: input.skills.map((item) => ({
                workerProfileId: profile.id,
                categoryId: item.categoryId,
                level: item.level,
              })),
            })
          }

          return tx.workerProfile.findUniqueOrThrow({
            where: { id: profile.id },
            include: profileInclude,
          })
        }),
      )

      return mapProfile(row)
    },

    async deleteByUserId(userId) {
      await prisma.workerProfile.delete({ where: { userId } })
    },

    async list(filters) {
      const and: Prisma.WorkerProfileWhereInput[] = [
        {
          user: filters.publicOnly
            ? {
                role: 'WORKER',
                status: 'ACTIVE',
                verificationStatus: 'VERIFIED',
              }
            : {
                role: 'WORKER',
                ...(filters.verificationStatus
                  ? { verificationStatus: filters.verificationStatus }
                  : {}),
              },
        },
      ]

      if (filters.publicOnly) and.push({ isPublic: true })
      if (filters.availability) and.push({ availability: filters.availability })
      if (filters.city) and.push({ city: { contains: filters.city, mode: 'insensitive' } })
      if (filters.country) {
        and.push({ country: { contains: filters.country, mode: 'insensitive' } })
      }
      if (filters.categoryId) {
        and.push({ skills: { some: { categoryId: filters.categoryId } } })
      }
      if (filters.q) {
        const q = filters.q
        and.push({
          OR: [
            { headline: { contains: q, mode: 'insensitive' } },
            { primaryTrade: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
            { bio: { contains: q, mode: 'insensitive' } },
            { user: { profile: { displayName: { contains: q, mode: 'insensitive' } } } },
            { user: { profile: { firstName: { contains: q, mode: 'insensitive' } } } },
            { user: { profile: { lastName: { contains: q, mode: 'insensitive' } } } },
          ],
        })
      }

      const where: Prisma.WorkerProfileWhereInput = { AND: and }
      const countWhere: Prisma.WorkerProfileWhereInput = {
        AND: and.filter((clause) => !('availability' in clause)),
      }

      const skip = (filters.page - 1) * filters.limit
      const includeCounts = filters.counts !== false

      const [total, rows, availabilityGroups] = await Promise.all([
        prisma.workerProfile.count({ where }),
        prisma.workerProfile.findMany({
          where,
          include: {
            user: {
              select: {
                verificationStatus: true,
                isVerified: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            skills: {
              take: 20,
              include: { category: { select: { name: true, isActive: true } } },
            },
          },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          skip,
          take: filters.limit,
        }),
        includeCounts
          ? prisma.workerProfile.groupBy({
              by: ['availability'],
              where: countWhere,
              _count: { _all: true },
            })
          : Promise.resolve([] as { availability: WorkerAvailability; _count: { _all: number } }[]),
      ])

      const availabilityCounts = emptyAvailabilityCounts()
      for (const group of availabilityGroups) {
        availabilityCounts[group.availability] = group._count._all
      }

      return {
        data: rows.map(mapDirectoryItem),
        meta: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
          availabilityCounts,
        },
      }
    },
  }
}
