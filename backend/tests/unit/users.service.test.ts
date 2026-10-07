import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UsersRepository } from '../../src/modules/users/users.repository.js'
import { createUsersService } from '../../src/modules/users/users.service.js'
import type { User } from '../../src/modules/users/users.types.js'

vi.mock('../../src/modules/auth/auth.tokens.js', () => ({
  hashPassword: vi.fn(async (password: string) => `hash:${password}`),
}))

const admin = { id: 'admin-1', roles: ['ADMIN'] }
const self = { id: 'user-1', roles: ['CLIENT'] }
const other = { id: 'user-2', roles: ['CLIENT'] }

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    role: 'CLIENT',
    status: 'ACTIVE',
    isVerified: false,
    profile: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      displayName: 'Ada Lovelace',
      phone: null,
      avatarUrl: null,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('usersService', () => {
  let repository: UsersRepository

  beforeEach(() => {
    repository = {
      findMany: vi.fn(async () => ({ users: [makeUser()], total: 1 })),
      findById: vi.fn(async () => makeUser()),
      findByEmail: vi.fn(async () => null),
      create: vi.fn(async (input) =>
        makeUser({
          email: input.email,
          role: input.role as User['role'],
          isVerified: input.isVerified ?? false,
        }),
      ),
      update: vi.fn(async (id, input) =>
        makeUser({
          id,
          role: (input.role as User['role'] | undefined) ?? 'CLIENT',
          status: (input.status as User['status'] | undefined) ?? 'ACTIVE',
          isVerified: input.isVerified ?? false,
        }),
      ),
      updateStatus: vi.fn(async (id, status) => makeUser({ id, status })),
    }
  })

  it('lists users with pagination meta', async () => {
    const service = createUsersService(repository)
    const result = await service.listUsers({ page: 1, limit: 20 })
    expect(result.data).toHaveLength(1)
    expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 20, totalPages: 1 })
  })

  it('creates a user when email is free', async () => {
    const service = createUsersService(repository)
    const created = await service.createUser({
      email: 'new@example.com',
      password: 'password1',
      role: 'MANAGER',
      firstName: 'New',
      lastName: 'User',
    })
    expect(created.email).toBe('new@example.com')
    expect(repository.create).toHaveBeenCalled()
  })

  it('rejects duplicate email on create', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(makeUser())
    const service = createUsersService(repository)
    await expect(
      service.createUser({
        email: 'user@example.com',
        password: 'password1',
        role: 'CLIENT',
      }),
    ).rejects.toMatchObject({ code: 'EMAIL_IN_USE', status: 409 })
  })

  it('allows self or admin to read a user', async () => {
    const service = createUsersService(repository)
    await expect(service.assertAccessible('user-1', self)).resolves.toMatchObject({ id: 'user-1' })
    await expect(service.assertAccessible('user-1', admin)).resolves.toMatchObject({ id: 'user-1' })
  })

  it('forbids another user from reading a private profile', async () => {
    const service = createUsersService(repository)
    await expect(service.assertAccessible('user-1', other)).rejects.toMatchObject({ status: 403 })
  })

  it('only admins can deactivate users', async () => {
    const service = createUsersService(repository)
    await expect(service.deactivateUser('user-1', self)).rejects.toMatchObject({ status: 403 })
    await expect(service.deactivateUser('user-1', admin)).resolves.toMatchObject({
      status: 'INACTIVE',
    })
  })

  it('throws not found for missing users', async () => {
    vi.mocked(repository.findById).mockResolvedValue(null)
    const service = createUsersService(repository)
    await expect(service.getUserById('missing')).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
      status: 404,
    })
  })

  it('forbids self from escalating role', async () => {
    const service = createUsersService(repository)
    await expect(
      service.updateUser('user-1', { role: 'SUPER' }, self),
    ).rejects.toMatchObject({ status: 403 })
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('lets an admin change role and status', async () => {
    const service = createUsersService(repository)
    await expect(
      service.updateUser('user-1', { role: 'MANAGER', status: 'INACTIVE' }, admin),
    ).resolves.toMatchObject({ id: 'user-1' })
    expect(repository.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ role: 'MANAGER', status: 'INACTIVE' }),
    )
  })

  it('lets self update profile fields only', async () => {
    const service = createUsersService(repository)
    await expect(
      service.updateUser('user-1', { firstName: 'Ada', displayName: 'Ada L' }, self),
    ).resolves.toMatchObject({ id: 'user-1' })
    expect(repository.update).toHaveBeenCalled()
  })
})
