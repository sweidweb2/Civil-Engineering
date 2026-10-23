import { conflict, notFound } from '../../errors/app-error.js'
import type { ManagerProfilesRepository } from './manager-profiles.repository.js'
import type {
  CreateManagerProfileBody,
  UpdateManagerProfileBody,
  UpsertManagerProfileBody,
} from './manager-profiles.schema.js'
import type { ManagerProfile } from './manager-profiles.types.js'

export type ManagerProfilesService = {
  getMine: (userId: string) => Promise<ManagerProfile | null>
  createMine: (userId: string, input: CreateManagerProfileBody) => Promise<ManagerProfile>
  updateMine: (userId: string, input: UpdateManagerProfileBody) => Promise<ManagerProfile>
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

    async createMine(userId, input) {
      const existing = await repository.findByUserId(userId)
      if (existing) {
        throw conflict('Manager profile already exists', 'MANAGER_PROFILE_EXISTS')
      }
      return repository.create(userId, input)
    },

    async updateMine(userId, input) {
      const existing = await repository.findByUserId(userId)
      if (!existing) {
        throw notFound('Manager profile not found', 'MANAGER_PROFILE_NOT_FOUND')
      }
      return repository.update(userId, input)
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
