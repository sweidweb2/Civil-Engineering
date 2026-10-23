import { hashPassword } from '../auth/auth.tokens.js'
import type { AuthActor } from '../../authz/index.js'
import { assertSelfOrAdmin, isAdmin, isSuper } from '../../authz/index.js'
import { conflict, forbidden, notFound, validationError } from '../../errors/app-error.js'
import type { FilesService } from '../files/index.js'
import type { UserDirectoryCounts, UsersRepository } from './users.repository.js'
import type {
  CreateApprovalBody,
  CreateUserBody,
  CreateVerificationBody,
  ListApprovalsQuery,
  ListLookupQuery,
  ListUsersQuery,
  ListVerificationsQuery,
  SetAvatarBody,
  SetVerificationBody,
  UpdateUserBody,
} from './users.schema.js'
import {
  APPROVAL_ROLES,
  type ApprovalRole,
  type User,
  type UserAvatarResult,
  type UserLookup,
  type VerificationStatus,
} from './users.types.js'

const AVATAR_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export type UsersService = {
  listUsers: (
    query: ListUsersQuery,
  ) => Promise<{
    data: User[]
    meta: { total: number; page: number; limit: number; totalPages: number; counts: UserDirectoryCounts }
  }>
  listLookup: (query: ListLookupQuery) => Promise<{
    data: UserLookup[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }>
  getUserById: (id: string) => Promise<User>
  /** Self or admin may read a user record. */
  assertAccessible: (id: string, actor: AuthActor) => Promise<User>
  createUser: (input: CreateUserBody, actor: AuthActor) => Promise<User>
  updateUser: (id: string, input: UpdateUserBody, actor: AuthActor) => Promise<User>
  setAvatar: (id: string, input: SetAvatarBody, actor: AuthActor) => Promise<UserAvatarResult>
  clearAvatar: (id: string, actor: AuthActor) => Promise<UserAvatarResult>
  getAvatarUrl: (id: string, actor: AuthActor) => Promise<UserAvatarResult>
  deactivateUser: (id: string, actor: AuthActor) => Promise<User>
  listApprovals: (query: ListApprovalsQuery) => Promise<{
    data: User[]
    meta: {
      total: number
      page: number
      limit: number
      totalPages: number
      counts: { pending: number; approved: number; providersPending: number }
    }
  }>
  createApproval: (input: CreateApprovalBody, actor: AuthActor) => Promise<User>
  approveUser: (id: string, actor: AuthActor) => Promise<User>
  unapproveUser: (id: string, actor: AuthActor) => Promise<User>
  deleteApproval: (id: string, actor: AuthActor) => Promise<void>
  listVerifications: (query: ListVerificationsQuery) => Promise<{
    data: User[]
    meta: {
      total: number
      page: number
      limit: number
      totalPages: number
      counts: { workers: number; unverified: number; requested: number; verified: number }
    }
  }>
  createVerification: (input: CreateVerificationBody, actor: AuthActor) => Promise<User>
  setVerification: (id: string, input: SetVerificationBody, actor: AuthActor) => Promise<User>
  deleteVerification: (id: string, actor: AuthActor) => Promise<void>
}

export type UsersFilesGateway = Pick<
  FilesService,
  'requireReadyAttachment' | 'downloadUrl' | 'softDelete'
>

const unavailableFiles: UsersFilesGateway = {
  async requireReadyAttachment() {
    throw validationError('Storage is not configured')
  },
  async downloadUrl() {
    throw validationError('Storage is not configured')
  },
  async softDelete() {
    throw validationError('Storage is not configured')
  },
}

export function createUsersService(
  repository: UsersRepository,
  filesService: UsersFilesGateway = unavailableFiles,
): UsersService {

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

  async function resolveAvatar(user: User, actor: AuthActor): Promise<UserAvatarResult> {
    const fileId = user.profile?.avatarUrl
    if (!fileId) return { user, avatarDownloadUrl: null }
    try {
      const result = await filesService.downloadUrl(actor, fileId)
      return { user, avatarDownloadUrl: result.downloadUrl }
    } catch {
      return { user, avatarDownloadUrl: null }
    }
  }

  function assertAdmin(actor: AuthActor): void {
    if (!isAdmin(actor.roles)) {
      throw forbidden('Only admins can manage registration approvals')
    }
  }

  function isApprovalRole(role: User['role']): role is ApprovalRole {
    return (APPROVAL_ROLES as readonly string[]).includes(role)
  }

  function assertSuperBoundary(actor: AuthActor, currentRole?: string, nextRole?: string): void {
    const touchesSuper = currentRole === 'SUPER' || nextRole === 'SUPER'
    if (touchesSuper && !isSuper(actor.roles)) {
      throw forbidden('Only a super admin can change a super account', 'SUPER_ROLE_REQUIRED')
    }
  }

  async function loadApprovalTarget(id: string, actor: AuthActor): Promise<User> {
    assertAdmin(actor)
    const user = await loadOrThrow(id)
    if (!isApprovalRole(user.role)) {
      throw conflict(
        'This role does not require registration approval',
        'APPROVAL_ROLE_NOT_REQUIRED',
      )
    }
    if (user.status === 'INACTIVE') {
      throw conflict(
        'Suspended accounts are changed from Users, not Approvals',
        'USER_SUSPENDED',
      )
    }
    return user
  }

  return {
    async listUsers(query) {
      const [{ users, total }, counts] = await Promise.all([
        repository.findMany(query),
        repository.countDirectory(),
      ])
      const page = query.page ?? 1
      const limit = query.limit ?? 20
      return {
        data: users,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          counts,
        },
      }
    },

    async listLookup(query) {
      const { users, total } = await repository.findLookup(query)
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
    
    async createUser(input, actor) {
      assertSuperBoundary(actor, undefined, input.role ?? 'CLIENT')
      const existing = await repository.findByEmail(input.email)
      if (existing) {
        throw conflict('Email already in use', 'EMAIL_IN_USE')
      }

      const passwordHash = await hashPassword(input.password)
      const isVerified = input.isVerified ?? false

      return repository.create({
        email: input.email,
        passwordHash,
        role: input.role,
        isVerified,
        verificationStatus: isVerified ? 'VERIFIED' : 'UNVERIFIED',
        profile: {
          firstName: input.firstName,
          lastName: input.lastName,
          displayName: input.displayName,
          phone: input.phone,
        },
      })
    },
    
    async updateUser(id, input, actor) {
      const user = await assertAccessible(id, actor)
      assertSuperBoundary(actor, user.role, input.role)

      const wantsPrivilegedChange =
        input.role !== undefined || input.status !== undefined || input.isVerified !== undefined

      if (wantsPrivilegedChange && !isAdmin(actor.roles)) {
        throw forbidden('Only admins can change role, status, or verification')
      }

      return repository.update(id, {
        role: input.role,
        status: input.status,
        isVerified: input.isVerified,
        verificationStatus:
          input.isVerified === undefined ? undefined : input.isVerified ? 'VERIFIED' : 'UNVERIFIED',
        profile: {
          firstName: input.firstName,
          lastName: input.lastName,
          displayName: input.displayName,
          phone: input.phone,
        },
      })
    },

    async setAvatar(id, input, actor) {
      const user = await assertAccessible(id, actor)
      const file = await filesService.requireReadyAttachment(input.fileId, 'USER', id)
      if (!AVATAR_MIMES.has(file.mime)) {
        throw validationError('Avatar must be a JPEG, PNG, or WebP image')
      }

      const previousFileId = user.profile?.avatarUrl
      const updated = await repository.setAvatarFileId(id, file.id)

      if (previousFileId && previousFileId !== file.id) {
        try {
          await filesService.softDelete(actor, previousFileId)
        } catch {
          // Previous object cleanup is best-effort; new avatar is already linked.
        }
      }

      return resolveAvatar(updated, actor)
    },

    async clearAvatar(id, actor) {
      const user = await assertAccessible(id, actor)
      const previousFileId = user.profile?.avatarUrl
      const updated = await repository.setAvatarFileId(id, null)
      if (previousFileId) {
        try {
          await filesService.softDelete(actor, previousFileId)
        } catch {
          // Ignore cleanup failures after clearing the profile link.
        }
      }
      return { user: updated, avatarDownloadUrl: null }
    },

    async getAvatarUrl(id, actor) {
      const user = await assertAccessible(id, actor)
      return resolveAvatar(user, actor)
    },
    
    async deactivateUser(id, actor) {
      if (!isAdmin(actor.roles)) {
        throw forbidden('Only admins can deactivate users')
      }
      const user = await loadOrThrow(id)
      assertSuperBoundary(actor, user.role)
      return repository.updateStatus(id, 'INACTIVE')
    },

    async listApprovals(query) {
      const page = query.page ?? 1
      const limit = query.limit ?? 20
      const [{ users, total }, counts] = await Promise.all([
        repository.findApprovals(query),
        repository.countApprovals(),
      ])
      return {
        data: users,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          counts,
        },
      }
    },

    async createApproval(input, actor) {
      assertAdmin(actor)
      const email = input.email.trim().toLowerCase()
      const existing = await repository.findByEmail(email)
      if (existing) {
        throw conflict('Email already in use', 'EMAIL_IN_USE')
      }

      const passwordHash = await hashPassword(input.password)
      return repository.create({
        email,
        passwordHash,
        role: input.role,
        status: 'PENDING',
        profile: {
          firstName: input.firstName,
          lastName: input.lastName,
          displayName: input.displayName,
          phone: input.phone,
        },
      })
    },

    async approveUser(id, actor) {
      const user = await loadApprovalTarget(id, actor)
      if (user.status === 'ACTIVE') return user
      return repository.updateStatus(id, 'ACTIVE')
    },

    async unapproveUser(id, actor) {
      const user = await loadApprovalTarget(id, actor)
      if (user.status === 'PENDING') return user
      return repository.updateStatus(id, 'PENDING')
    },

    async deleteApproval(id, actor) {
      const user = await loadApprovalTarget(id, actor)
      if (user.status !== 'PENDING') {
        throw conflict('Only pending registrations can be deleted', 'APPROVAL_NOT_PENDING')
      }
      const result = await repository.delete(id)
      if (result === 'in_use') {
        throw conflict(
          'This registration is linked to other records and cannot be deleted',
          'APPROVAL_IN_USE',
        )
      }
    },

    async listVerifications(query) {
      const page = query.page ?? 1
      const limit = query.limit ?? 20
      const [{ users, total }, counts] = await Promise.all([
        repository.findVerifications(query),
        repository.countVerifications(),
      ])
      return {
        data: users,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          counts,
        },
      }
    },

    async createVerification(input, actor) {
      assertAdmin(actor)
      const email = input.email.trim().toLowerCase()
      const existing = await repository.findByEmail(email)
      if (existing) {
        throw conflict('Email already in use', 'EMAIL_IN_USE')
      }

      const passwordHash = await hashPassword(input.password)
      return repository.create({
        email,
        passwordHash,
        role: 'WORKER',
        status: 'PENDING',
        verificationStatus: 'REQUESTED',
        isVerified: false,
        profile: {
          firstName: input.firstName,
          lastName: input.lastName,
          displayName: input.displayName,
          phone: input.phone,
        },
      })
    },

    async setVerification(id, input, actor) {
      assertAdmin(actor)
      const user = await loadOrThrow(id)
      if (user.role !== 'WORKER') {
        throw conflict('Only workers have marketplace verification', 'VERIFICATION_ROLE_NOT_WORKER')
      }
      const verificationStatus = input.verificationStatus as VerificationStatus
      if (user.verificationStatus === verificationStatus) return user
      return repository.updateVerification(id, verificationStatus)
    },

    async deleteVerification(id, actor) {
      assertAdmin(actor)
      const user = await loadOrThrow(id)
      if (user.role !== 'WORKER') {
        throw conflict('Only workers can be removed from verification', 'VERIFICATION_ROLE_NOT_WORKER')
      }
      const result = await repository.delete(id)
      if (result === 'in_use') {
        throw conflict(
          'This worker is linked to other records and cannot be deleted',
          'VERIFICATION_IN_USE',
        )
      }
    },
  }
}
