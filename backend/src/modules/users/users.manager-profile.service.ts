import { isUniqueConflictError, notFound } from '../../errors/app-error.js'
import type { ManagerProfilesRepository } from './users.manager-profile.repository.js'
import type { UpsertManagerProfileBody } from './users.manager-profile.schema.js'
import type { ManagerProfile } from './users.manager-profile.types.js'

export type ManagerProfilesService = {
  getMine: (userId: string) => Promise<ManagerProfile | null>
  upsertMine: (userId: string, input: UpsertManagerProfileBody) => Promise<ManagerProfile>
  deleteMine: (userId: string) => Promise<void>
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
        if (!isUniqueConflictError(error)) throw error
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
