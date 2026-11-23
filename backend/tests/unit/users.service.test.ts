import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UsersRepository } from '../../src/modules/users/users.repository.js'
import { createUsersService } from '../../src/modules/users/users.service.js'
import type { User } from '../../src/modules/users/users.types.js'

vi.mock('../../src/modules/auth/auth.tokens.js', () => ({
  hashPassword: vi.fn(async (password: string) => `hash:${password}`),
}))

const admin = { id: 'admin-1', roles: ['ADMIN'] }
const superAdmin = { id: 'super-1', roles: ['SUPER'] }
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
      findLookup: vi.fn(async () => ({
        users: [{ id: 'user-1', email: 'user@example.com', name: 'Ada Lovelace' }],
        total: 1,
      })),
      countDirectory: vi.fn(async () => ({
        accounts: 4,
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
        roles: { SUPER: 0, ADMIN: 1, MANAGER: 2, PROVIDER: 0, WORKER: 0, CLIENT: 1 },
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
      updateStatusIf: vi.fn(async (id, _from, toStatus) => makeUser({ id, status: toStatus })),
      setAvatarFileId: vi.fn(async (userId, fileId) =>
        makeUser({
          id: userId,
          profile: {
            firstName: 'Ada',
            lastName: 'Lovelace',
            displayName: 'Ada Lovelace',
            phone: null,
            avatarUrl: fileId,
          },
        }),
      ),
      findApprovals: vi.fn(async () => ({
        users: [makeUser({ role: 'MANAGER', status: 'PENDING' })],
        total: 1,
      })),
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
      deleteWorkerProfileByUserId: vi.fn(async () => undefined),
      delete: vi.fn(async () => 'deleted' as const),
      deleteIfStatus: vi.fn(async () => 'deleted' as const),
    }
  })

  it('returns lean lookup rows for recipient pickers', async () => {
    const service = createUsersService(repository)
    await expect(service.listLookup({ page: 1, limit: 20 }, admin)).resolves.toEqual({
      data: [{ id: 'user-1', email: 'user@example.com', name: 'Ada Lovelace' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    })
  })

  it('lists users with pagination meta', async () => {
    const service = createUsersService(repository)
    const result = await service.listUsers({ page: 1, limit: 20 }, admin)
    expect(result.data).toHaveLength(1)
    expect(result.meta).toMatchObject({
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      counts: { accounts: 4, active: 4, inactive: 1, managers: 2 },
    })
  })

  it('adds loadable avatar image URLs to admin list rows (null when unresolved)', async () => {
    vi.mocked(repository.findMany).mockResolvedValueOnce({
      users: [
        makeUser({ id: 'u-a', profile: { ...makeUser().profile!, avatarUrl: 'file-a' } }),
        makeUser({ id: 'u-b', profile: { ...makeUser().profile!, avatarUrl: 'file-gone' } }),
        makeUser({ id: 'u-c' }),
      ],
      total: 3,
    })
    const resolveAvatarUrls = vi.fn(async () => new Map([['file-a', 'https://cdn/a.jpg']]))
    const service = createUsersService(repository, undefined, undefined, resolveAvatarUrls)

    const page = await service.listUsers({ page: 1, limit: 20, counts: false }, admin)

    expect(resolveAvatarUrls).toHaveBeenCalledWith(['file-a', 'file-gone'])
    expect(page.data.map((u) => u.avatarImageUrl)).toEqual(['https://cdn/a.jpg', null, null])
  })

  it('skips directory and approval counts when counts=false', async () => {
    const service = createUsersService(repository)
    const users = await service.listUsers({ page: 1, limit: 20, counts: false }, admin)
    expect(repository.countDirectory).not.toHaveBeenCalled()
    expect(users.meta).toMatchObject({ total: 1, counts: { accounts: 0, active: 0 } })

    const approvals = await service.listApprovals(
      { page: 1, limit: 20, approval: 'pending', counts: false },
      admin,
    )
    expect(repository.countApprovals).not.toHaveBeenCalled()
    expect(approvals.meta).toMatchObject({
      total: 1,
      counts: { pending: 0, approved: 0, providersPending: 0 },
    })
  })

  describe('getAdminOverview', () => {
    function overviewGateway() {
      return {
        providers: {
          countProvidersByStatus: vi.fn(async () => ({ PENDING: 2, APPROVED: 3, SUSPENDED: 1 })),
        },
        listings: {
          countListingsByStatus: vi.fn(async () => ({ ACTIVE: 7, INACTIVE: 2 })),
        },
        projects: {
          listProjects: vi.fn(async () => ({
            data: [],
            meta: { total: 11, page: 1, limit: 5, totalPages: 3 },
          })),
        },
        reviews: {
          countReviewsByStatus: vi.fn(async () => ({ PENDING: 4, ACCEPTED: 5, REJECTED: 1 })),
        },
      }
    }

    it('aggregates counts and recent projects for admins', async () => {
      const gateway = overviewGateway()
      const service = createUsersService(repository, undefined, gateway)
      await expect(service.getAdminOverview(admin)).resolves.toEqual({
        users: 4,
        managers: 2,
        workers: 1,
        providers: 6,
        pendingProviders: 2,
        projects: 11,
        listings: 9,
        reviews: 10,
        verificationRequests: 1,
        pendingRequests: 1,
        pendingReviews: 4,
        recentProjects: [],
      })
      expect(gateway.projects.listProjects).toHaveBeenCalledWith({ page: 1, limit: 5 }, admin)
    })

    it('forbids non-admins', async () => {
      const service = createUsersService(repository, undefined, overviewGateway())
      await expect(service.getAdminOverview(self)).rejects.toMatchObject({ status: 403 })
    })
  })

  it('creates a user when email is free', async () => {
    const service = createUsersService(repository)
    const created = await service.createUser(
      {
        email: 'new@example.com',
        password: 'password1',
        role: 'MANAGER',
        firstName: 'New',
        lastName: 'User',
      },
      admin,
    )
    expect(created.email).toBe('new@example.com')
    expect(repository.create).toHaveBeenCalled()
  })

  it('rejects duplicate email on create', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(makeUser())
    const service = createUsersService(repository)
    await expect(
      service.createUser(
        {
          email: 'user@example.com',
          password: 'password1',
          role: 'CLIENT',
        },
        admin,
      ),
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
    await expect(service.updateUser('user-1', { role: 'SUPER' }, self)).rejects.toMatchObject({
      status: 403,
    })
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
      { deleteWorkerProfile: false },
    )
  })

  it('deletes the worker CV when the account leaves the WORKER role', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeUser({ role: 'WORKER' }))
    const service = createUsersService(repository)
    await service.updateUser('user-1', { role: 'CLIENT' }, admin)
    expect(repository.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ role: 'CLIENT' }),
      { deleteWorkerProfile: true },
    )
  })

  it('preserves REQUESTED verification when isVerified is set false', async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeUser({ role: 'WORKER', verificationStatus: 'REQUESTED', isVerified: false }),
    )
    const service = createUsersService(repository)
    await service.updateUser('user-1', { isVerified: false }, admin)
    expect(repository.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        isVerified: false,
        verificationStatus: 'REQUESTED',
      }),
      expect.anything(),
    )
  })

  it('only a super admin can create, change, or deactivate a super account', async () => {
    const service = createUsersService(repository)
    await expect(
      service.createUser(
        { email: 'root@example.com', password: 'password1', role: 'SUPER' },
        admin,
      ),
    ).rejects.toMatchObject({ status: 403, code: 'SUPER_ROLE_REQUIRED' })

    await expect(
      service.createUser(
        { email: 'root@example.com', password: 'password1', role: 'SUPER' },
        superAdmin,
      ),
    ).resolves.toMatchObject({ email: 'root@example.com' })

    vi.mocked(repository.findById).mockResolvedValue(makeUser({ role: 'SUPER' }))
    await expect(service.updateUser('user-1', { firstName: 'Ada' }, admin)).rejects.toMatchObject({
      status: 403,
      code: 'SUPER_ROLE_REQUIRED',
    })
    await expect(service.deactivateUser('user-1', admin)).rejects.toMatchObject({
      status: 403,
      code: 'SUPER_ROLE_REQUIRED',
    })
    await expect(service.deactivateUser('user-1', superAdmin)).resolves.toMatchObject({
      status: 'INACTIVE',
    })
  })

  it('approves a pending manager and rejects other roles', async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeUser({ role: 'MANAGER', status: 'PENDING' }),
    )
    const service = createUsersService(repository)
    await expect(service.approveUser('user-1', admin)).resolves.toMatchObject({ status: 'ACTIVE' })
    expect(repository.updateStatusIf).toHaveBeenCalledWith('user-1', 'PENDING', 'ACTIVE')

    vi.mocked(repository.findById).mockResolvedValue(
      makeUser({ role: 'CLIENT', status: 'PENDING' }),
    )
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
    await expect(service.unapproveUser('user-1', admin)).resolves.toMatchObject({
      status: 'PENDING',
    })
    expect(repository.updateStatusIf).toHaveBeenCalledWith('user-1', 'ACTIVE', 'PENDING')
  })

  it('deletes only pending registrations', async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeUser({ role: 'WORKER', status: 'PENDING' }),
    )
    const service = createUsersService(repository)
    await expect(service.deleteApproval('user-1', admin)).resolves.toBeUndefined()
    expect(repository.deleteIfStatus).toHaveBeenCalledWith('user-1', 'PENDING')

    vi.mocked(repository.findById).mockResolvedValue(makeUser({ role: 'WORKER', status: 'ACTIVE' }))
    await expect(service.deleteApproval('user-1', admin)).rejects.toMatchObject({
      status: 409,
      code: 'APPROVAL_NOT_PENDING',
    })
  })

  it('rejects deleteApproval when status flips concurrently', async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeUser({ role: 'WORKER', status: 'PENDING' }),
    )
    vi.mocked(repository.deleteIfStatus).mockResolvedValue('status_mismatch')
    const service = createUsersService(repository)
    await expect(service.deleteApproval('user-1', admin)).rejects.toMatchObject({
      status: 409,
      code: 'APPROVAL_NOT_PENDING',
    })
  })

  it('returns 404 when approve races with a concurrent delete', async () => {
    vi.mocked(repository.findById)
      .mockResolvedValueOnce(makeUser({ role: 'WORKER', status: 'PENDING' }))
      .mockResolvedValueOnce(null)
    vi.mocked(repository.updateStatusIf).mockResolvedValue(null)
    const service = createUsersService(repository)
    await expect(service.approveUser('user-1', admin)).rejects.toMatchObject({ status: 404 })
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
