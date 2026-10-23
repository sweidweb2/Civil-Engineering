import { notFound } from '../../errors/app-error.js'
import { Prisma } from '../../generated/prisma/client.js'
import type { ManagerProfilesRepository } from './manager-profiles.repository.js'
import type { UpsertManagerProfileBody } from './manager-profiles.schema.js'
import type { ManagerProfile } from './manager-profiles.types.js'

export type ManagerProfilesService = {
  getMine: (userId: string) => Promise<ManagerProfile | null>
  upsertMine: (userId: string, input: UpsertManagerProfileBody) => Promise<ManagerProfile>
  deleteMine: (userId: string) => Promise<void>
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export function createManagerProfilesService(
  repository: ManagerProfilesRepository,
): ManagerProfilesService {
  return {
    async getMine(userId) {
      return repository.findByUserId(userId)
    },

    async upsertMine(userId, input) {
      const existing = await repository.findByUserId(userId)
      if (existing) {
        return repository.update(userId, input)
      }
      try {
        return await repository.create(userId, input)
      } catch (error) {
        // Concurrent first-save: unique(userId) race → treat as update.
        if (!isUniqueViolation(error)) throw error
        return repository.update(userId, input)
      }
    },

    async deleteMine(userId) {
      const existing = await repository.findByUserId(userId)
      if (!existing) {
        throw notFound('Manager profile not found', 'MANAGER_PROFILE_NOT_FOUND')
      }
      await repository.deleteByUserId(userId)
    },
  }
}
