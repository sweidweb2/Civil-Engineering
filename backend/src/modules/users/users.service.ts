import { notFound, notImplemented } from '../../errors/app-error.js'
import type { UsersRepository } from './users.repository.js'
import type { CreateUserBody, UpdateUserBody } from './users.schema.js'
import type { User } from './users.types.js'

export type UsersService = {
  listUsers: () => Promise<User[]>
  getUserById: (id: string) => Promise<User>
  createUser: (input: CreateUserBody) => Promise<User>
  updateUser: (id: string, input: UpdateUserBody) => Promise<User>
  deactivateUser: (id: string) => Promise<User>
}

export function createUsersService(repository: UsersRepository): UsersService {
  return {
    async listUsers() {
      return repository.findMany()
    },
    async getUserById(id) {
      const user = await repository.findById(id)
      if (!user) {
        throw notFound('User not found', 'USER_NOT_FOUND')
      }
      return user
    },
    async createUser() {
      throw notImplemented('users.createUser')
    },
    async updateUser() {
      throw notImplemented('users.updateUser')
    },
    async deactivateUser() {
      throw notImplemented('users.deactivateUser')
    },
  }
}
