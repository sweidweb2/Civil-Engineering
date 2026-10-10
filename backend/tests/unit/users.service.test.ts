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
    verificationStatus: 'UNVERIFIED',
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
      countDirectory: vi.fn(async () => ({
        active: 4,
        inactive: 1,
        managers: 2,
        createdThisMonth: 1,
        createdLastMonth: 1,
        activeCreatedThisMonth: 1,
        activeCreatedLastMonth: 0,
        inactiveCreatedThisMonth: 0,
        inactiveCreatedLastMonth: 1,
        managersCreatedThisMonth: 0,
        managersCreatedLastMonth: 0,
      })),
      findById: vi.fn(async () => makeUser()),
      findByEmail: vi.fn(async () => null),
      create: vi.fn(async (input) =>
        makeUser({
          email: input.email,
          role: input.role as User['role'],
          verificationStatus: input.verificationStatus ?? 'UNVERIFIED',
          isVerified: input.isVerified ?? false,
        }),
      ),
      update: vi.fn(async (id, input) =>
        makeUser({
          id,
          role: (input.role as User['role'] | undefined) ?? 'CLIENT',
          status: (input.status as User['status'] | undefined) ?? 'ACTIVE',
          verificationStatus: input.verificationStatus ?? 'UNVERIFIED',
          isVerified: input.isVerified ?? false,
        }),
      ),
      updateStatus: vi.fn(async (id, status) => makeUser({ id, status })),
      findApprovals: vi.fn(async () => ({ users: [makeUser({ role: 'MANAGER', status: 'PENDING' })], total: 1 })),
      countApprovals: vi.fn(async () => ({ pending: 1, approved: 0, providersPending: 0 })),
      findVerifications: vi.fn(async () => ({
        users: [makeUser({ role: 'WORKER', verificationStatus: 'REQUESTED' })],
        total: 1,
      })),
      countVerifications: vi.fn(async () => ({
        workers: 1,
        unverified: 0,
        requested: 1,
        verified: 0,
      })),
      updateVerification: vi.fn(async (id, verificationStatus) =>
        makeUser({
          id,
          role: 'WORKER',
          verificationStatus,
          isVerified: verificationStatus === 'VERIFIED',
        }),
      ),
      delete: vi.fn(async () => 'deleted' as const),
    }
  })

  it('lists users with pagination meta', async () => {
    const service = createUsersService(repository)
    const result = await service.listUsers({ page: 1, limit: 20 })
    expect(result.data).toHaveLength(1)
    expect(result.meta).toMatchObject({
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      counts: { active: 4, inactive: 1, managers: 2 },
    })
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

  it('approves a pending manager and rejects other roles', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeUser({ role: 'MANAGER', status: 'PENDING' }))
    const service = createUsersService(repository)
    await expect(service.approveUser('user-1', admin)).resolves.toMatchObject({ status: 'ACTIVE' })
    expect(repository.updateStatus).toHaveBeenCalledWith('user-1', 'ACTIVE')

    vi.mocked(repository.findById).mockResolvedValue(makeUser({ role: 'CLIENT', status: 'PENDING' }))
    await expect(service.approveUser('user-1', admin)).rejects.toMatchObject({
      status: 409,
      code: 'APPROVAL_ROLE_NOT_REQUIRED',
    })
  })

  it('forbids non-admins from creating a pending registration', async () => {
    const service = createUsersService(repository)
    await expect(
      service.createApproval(
        { email: 'new@example.com', password: 'password1', role: 'WORKER' },
        self,
      ),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('creates a pending registration for an approval role', async () => {
    const service = createUsersService(repository)
    await service.createApproval(
      { email: 'New@Example.com', password: 'password1', role: 'PROVIDER', firstName: 'New' },
      admin,
    )
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@example.com',
        role: 'PROVIDER',
        status: 'PENDING',
      }),
    )
  })

  it('moves an approved worker back to pending', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeUser({ role: 'WORKER', status: 'ACTIVE' }))
    const service = createUsersService(repository)
    await expect(service.unapproveUser('user-1', admin)).resolves.toMatchObject({ status: 'PENDING' })
    expect(repository.updateStatus).toHaveBeenCalledWith('user-1', 'PENDING')
  })

  it('deletes only pending registrations', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeUser({ role: 'WORKER', status: 'PENDING' }))
    const service = createUsersService(repository)
    await expect(service.deleteApproval('user-1', admin)).resolves.toBeUndefined()
    expect(repository.delete).toHaveBeenCalledWith('user-1')

    vi.mocked(repository.findById).mockResolvedValue(makeUser({ role: 'WORKER', status: 'ACTIVE' }))
    await expect(service.deleteApproval('user-1', admin)).rejects.toMatchObject({
      status: 409,
      code: 'APPROVAL_NOT_PENDING',
    })
  })

  it('creates a pending worker with verification requested', async () => {
    const service = createUsersService(repository)
    await service.createVerification(
      { email: 'Worker@Example.com', password: 'password1', firstName: 'Wren' },
      admin,
    )
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'worker@example.com',
        role: 'WORKER',
        status: 'PENDING',
        verificationStatus: 'REQUESTED',
        isVerified: false,
      }),
    )
  })

  it('advances worker verification and rejects other roles', async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeUser({ role: 'WORKER', verificationStatus: 'REQUESTED' }),
    )
    const service = createUsersService(repository)
    await expect(
      service.setVerification('user-1', { verificationStatus: 'VERIFIED' }, admin),
    ).resolves.toMatchObject({ verificationStatus: 'VERIFIED', isVerified: true })
    expect(repository.updateVerification).toHaveBeenCalledWith('user-1', 'VERIFIED')

    vi.mocked(repository.findById).mockResolvedValue(makeUser({ role: 'MANAGER' }))
    await expect(
      service.setVerification('user-1', { verificationStatus: 'VERIFIED' }, admin),
    ).rejects.toMatchObject({ status: 409, code: 'VERIFICATION_ROLE_NOT_WORKER' })
  })

  it('deletes a worker from verification and blocks linked records', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeUser({ role: 'WORKER' }))
    const service = createUsersService(repository)
    await expect(service.deleteVerification('user-1', admin)).resolves.toBeUndefined()
    expect(repository.delete).toHaveBeenCalledWith('user-1')

    vi.mocked(repository.delete).mockResolvedValue('in_use')
    await expect(service.deleteVerification('user-1', admin)).rejects.toMatchObject({
      status: 409,
      code: 'VERIFICATION_IN_USE',
    })
  })

  it('lets self update profile fields only', async () => {
    const service = createUsersService(repository)
    await expect(
      service.updateUser('user-1', { firstName: 'Ada', displayName: 'Ada L' }, self),
    ).resolves.toMatchObject({ id: 'user-1' })
    expect(repository.update).toHaveBeenCalled()
  })
})
