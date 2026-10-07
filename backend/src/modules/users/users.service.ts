import { hashPassword } from '../auth/auth.tokens.js'
import type { AuthActor } from '../../authz/index.js'
import { assertSelfOrAdmin, isAdmin } from '../../authz/index.js'
import { conflict, forbidden, notFound } from '../../errors/app-error.js'
import type { UsersRepository } from './users.repository.js'
import type { CreateUserBody, ListUsersQuery, UpdateUserBody } from './users.schema.js'
import type { User } from './users.types.js'

export type UsersService = {
  listUsers: (query: ListUsersQuery) => Promise<{ data: User[]; meta: { total: number; page: number; limit: number; totalPages: number } }>
  getUserById: (id: string) => Promise<User>
  /** Self or admin may read a user record. */
  assertAccessible: (id: string, actor: AuthActor) => Promise<User>
  createUser: (input: CreateUserBody) => Promise<User>
  updateUser: (id: string, input: UpdateUserBody, actor: AuthActor) => Promise<User>
  deactivateUser: (id: string, actor: AuthActor) => Promise<User>
}

export function createUsersService(repository: UsersRepository): UsersService {
  async function loadOrThrow(id: string): Promise<User> {
    const user = await repository.findById(id)
    if (!user) {
      throw notFound('User not found', 'USER_NOT_FOUND')
    }
    return user
  }

  async function assertAccessible(id: string, actor: AuthActor): Promise<User> {
    const user = await loadOrThrow(id)
    assertSelfOrAdmin(actor, user.id)
    return user
  }

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
      return loadOrThrow(id)
    },
    
    assertAccessible,
    
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
        isVerified: input.isVerified,
        profile: {
          firstName: input.firstName,
          lastName: input.lastName,
          displayName: input.displayName,
          phone: input.phone,
        },
      })
    },
    
    async updateUser(id, input, actor) {
      await assertAccessible(id, actor)

      const wantsPrivilegedChange =
        input.role !== undefined || input.status !== undefined || input.isVerified !== undefined

      if (wantsPrivilegedChange && !isAdmin(actor.roles)) {
        throw forbidden('Only admins can change role, status, or verification')
      }

      return repository.update(id, {
        role: input.role,
        status: input.status,
        isVerified: input.isVerified,
        profile: {
          firstName: input.firstName,
          lastName: input.lastName,
          displayName: input.displayName,
          phone: input.phone,
        },
      })
    },
    
    async deactivateUser(id, actor) {
      if (!isAdmin(actor.roles)) {
        throw forbidden('Only admins can deactivate users')
      }
      await loadOrThrow(id)
      return repository.updateStatus(id, 'INACTIVE')
    },
  }
}
