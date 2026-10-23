import { notFound } from '../../errors/app-error.js'
import type { ManagerProfilesRepository } from './manager-profiles.repository.js'
import type { UpsertManagerProfileBody } from './manager-profiles.schema.js'
import type { ManagerProfile } from './manager-profiles.types.js'

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
      if (!existing) {
        return repository.create(userId, input)
      }
      return repository.update(userId, input)
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
