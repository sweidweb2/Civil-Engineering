import { prisma } from '../../database/prisma.js'
import type { ManagerProfile as PrismaManagerProfile } from '../../generated/prisma/client.js'

import type { ManagerProfile } from './manager-profiles.types.js'

export type ManagerProfileWriteInput = {
  headline?: string | null
  bio?: string | null
  yearsExperience?: number | null
  specialty?: string | null
  education?: string | null
  certifications?: string | null
  skills?: string | null
  languages?: string | null
  city?: string | null
  country?: string | null
  website?: string | null
  linkedinUrl?: string | null
  cvUrl?: string | null
  availability?: string | null
  projectTypes?: string | null
}

export type ManagerProfilesRepository = {
  findByUserId: (userId: string) => Promise<ManagerProfile | null>
  create: (userId: string, input: ManagerProfileWriteInput) => Promise<ManagerProfile>
  update: (userId: string, input: ManagerProfileWriteInput) => Promise<ManagerProfile>
  deleteByUserId: (userId: string) => Promise<void>
}

function mapRow(row: PrismaManagerProfile): ManagerProfile {
  return {
    id: row.id,
    userId: row.userId,
    headline: row.headline,
    bio: row.bio,
    yearsExperience: row.yearsExperience,
    specialty: row.specialty,
    education: row.education,
    certifications: row.certifications,
    skills: row.skills,
    languages: row.languages,
    city: row.city,
    country: row.country,
    website: row.website,
    linkedinUrl: row.linkedinUrl,
    cvUrl: row.cvUrl,
    availability: row.availability,
    projectTypes: row.projectTypes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function createManagerProfilesRepository(): ManagerProfilesRepository {
  return {
    async findByUserId(userId) {
      const row = await prisma.managerProfile.findUnique({ where: { userId } })
      return row ? mapRow(row) : null
    },

    async create(userId, input) {
      const row = await prisma.managerProfile.create({
        data: {
          userId,
          headline: input.headline ?? null,
          bio: input.bio ?? null,
          yearsExperience: input.yearsExperience ?? null,
          specialty: input.specialty ?? null,
          education: input.education ?? null,
          certifications: input.certifications ?? null,
          skills: input.skills ?? null,
          languages: input.languages ?? null,
          city: input.city ?? null,
          country: input.country ?? null,
          website: input.website ?? null,
          linkedinUrl: input.linkedinUrl ?? null,
          cvUrl: input.cvUrl ?? null,
          availability: input.availability ?? null,
          projectTypes: input.projectTypes ?? null,
        },
      })
      return mapRow(row)
    },

    async update(userId, input) {
      const row = await prisma.managerProfile.update({
        where: { userId },
        data: {
          headline: input.headline,
          bio: input.bio,
          yearsExperience: input.yearsExperience,
          specialty: input.specialty,
          education: input.education,
          certifications: input.certifications,
          skills: input.skills,
          languages: input.languages,
          city: input.city,
          country: input.country,
          website: input.website,
          linkedinUrl: input.linkedinUrl,
          cvUrl: input.cvUrl,
          availability: input.availability,
          projectTypes: input.projectTypes,
        },
      })
      return mapRow(row)
    },

    async deleteByUserId(userId) {
      await prisma.managerProfile.delete({ where: { userId } })
    },
  }
}
