import { hashPassword } from '../auth/auth.tokens.js'
import { conflict, notFound } from '../../errors/app-error.js'
import type { UsersRepository } from './users.repository.js'
import type { CreateUserBody, ListUsersQuery, UpdateUserBody } from './users.schema.js'
import type { User } from './users.types.js'

export type UsersService = {
  listUsers: (query: ListUsersQuery) => Promise<{ data: User[]; meta: { total: number; page: number; limit: number; totalPages: number } }>
  getUserById: (id: string) => Promise<User>
  createUser: (input: CreateUserBody) => Promise<User>
  updateUser: (id: string, input: UpdateUserBody) => Promise<User>
  deactivateUser: (id: string) => Promise<User>
}

export function createUsersService(repository: UsersRepository): UsersService {
  return {
    async listUsers(query) {
      const { users, total } = await repository.findMany(query)
      const page = query.page ?? 1
      const limit = query.limit ?? 20
      return {
        data: users,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }
    },

    async getUserById(id) {
      const user = await repository.findById(id)
      if (!user) {
        throw notFound('User not found', 'USER_NOT_FOUND')
      }
      return user
    },

    async createUser(input) {
      const existing = await repository.findByEmail(input.email)
      if (existing) {
        throw conflict('Email already in use', 'EMAIL_IN_USE')
      }

      const passwordHash = await hashPassword(input.password)
      
      return repository.create({
        email: input.email,
        passwordHash,
        role: input.role,
        profile: {
          firstName: input.firstName,
          lastName: input.lastName,
          displayName: input.displayName,
          phone: input.phone,
        },
      })
    },

    async updateUser(id, input) {
      const user = await repository.findById(id)
      if (!user) {
        throw notFound('User not found', 'USER_NOT_FOUND')
      }

      return repository.update(id, {
        role: input.role,
        status: input.status,
        profile: {
          firstName: input.firstName,
          lastName: input.lastName,
          displayName: input.displayName,
          phone: input.phone,
        },
      })
    },

    async deactivateUser(id) {
      const user = await repository.findById(id)
      if (!user) {
        throw notFound('User not found', 'USER_NOT_FOUND')
      }

      return repository.updateStatus(id, 'INACTIVE')
    },
  }
}
