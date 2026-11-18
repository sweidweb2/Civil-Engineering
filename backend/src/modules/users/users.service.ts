import { assertSelfOrAdmin, type AuthActor, isAdmin, isSuper } from '../../authz/index.js'
import { conflict, forbidden, notFound, validationError } from '../../errors/app-error.js'
import { invalidateAccessPrincipal } from '../../middleware/access-principal.js'
import { hashPassword } from '../auth/auth.tokens.js'
import {
  assertAllowedImageUpload,
  isAllowedImageMime,
  MAX_BRAND_IMAGE_BYTES,
} from '../files/image-policy.js'
import type { FilesService } from '../files/index.js'
import type { ListingsService } from '../listings/index.js'
import type { ProjectsService } from '../projects/index.js'
import type { ProvidersService } from '../providers/index.js'
import type { ReviewsService } from '../reviews/index.js'
import type { ApprovalCounts, UserDirectoryCounts, UsersRepository } from './users.repository.js'
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
  type AdminOverview,
  APPROVAL_ROLES,
  type ApprovalRole,
  type User,
  type UserAvatarResult,
  type UserLookup,
  type VerificationStatus,
} from './users.types.js'

export type UsersService = {
  listUsers: (
    query: ListUsersQuery,
    actor: AuthActor,
  ) => Promise<{
    data: User[]
    meta: {
      total: number
      page: number
      limit: number
      totalPages: number
      counts: UserDirectoryCounts
    }
  }>
  listLookup: (
    query: ListLookupQuery,
    actor: AuthActor,
  ) => Promise<{
    data: UserLookup[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }>
  /** Admin dashboard aggregate in one round-trip (counts + newest projects). */
  getAdminOverview: (actor: AuthActor) => Promise<AdminOverview>
  getUserById: (id: string) => Promise<User>
  /** Self or admin may read a user record. */
  assertAccessible: (id: string, actor: AuthActor) => Promise<User>
  /** Profile read with avatar download URL in one round-trip. */
  getUserWithAvatar: (id: string, actor: AuthActor) => Promise<UserAvatarResult>
  createUser: (input: CreateUserBody, actor: AuthActor) => Promise<User>
  updateUser: (id: string, input: UpdateUserBody, actor: AuthActor) => Promise<User>
  setAvatar: (id: string, input: SetAvatarBody, actor: AuthActor) => Promise<UserAvatarResult>
  uploadAvatar: (
    id: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    actor: AuthActor,
  ) => Promise<UserAvatarResult>
  clearAvatar: (id: string, actor: AuthActor) => Promise<UserAvatarResult>
  getAvatarUrl: (id: string, actor: AuthActor) => Promise<UserAvatarResult>
  deactivateUser: (id: string, actor: AuthActor) => Promise<User>
  listApprovals: (
    query: ListApprovalsQuery,
    actor: AuthActor,
  ) => Promise<{
    data: User[]
    meta: {
      total: number
      page: number
      limit: number
      totalPages: number
      counts: ApprovalCounts
    }
  }>
  createApproval: (input: CreateApprovalBody, actor: AuthActor) => Promise<User>
  approveUser: (id: string, actor: AuthActor) => Promise<User>
  unapproveUser: (id: string, actor: AuthActor) => Promise<User>
  deleteApproval: (id: string, actor: AuthActor) => Promise<void>
  listVerifications: (
    query: ListVerificationsQuery,
    actor: AuthActor,
  ) => Promise<{
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
  'requireReadyAttachment' | 'downloadUrl' | 'softDelete' | 'uploadBytes'
>

/** Public service surfaces of other modules used by the admin overview (no repository reach-in). */
export type UsersAdminOverviewGateway = {
  providers: Pick<ProvidersService, 'countProvidersByStatus'>
  listings: Pick<ListingsService, 'countListingsByStatus'>
  projects: Pick<ProjectsService, 'listProjects'>
  reviews: Pick<ReviewsService, 'countReviewsByStatus'>
}

const RECENT_PROJECTS_LIMIT = 5

const emptyDirectoryCounts: UserDirectoryCounts = {
  accounts: 0,
  active: 0,
  inactive: 0,
  managers: 0,
  createdThisMonth: 0,
  createdLastMonth: 0,
  activeCreatedThisMonth: 0,
  activeCreatedLastMonth: 0,
  inactiveCreatedThisMonth: 0,
  inactiveCreatedLastMonth: 0,
  managersCreatedThisMonth: 0,
  managersCreatedLastMonth: 0,
  roles: { SUPER: 0, ADMIN: 0, MANAGER: 0, PROVIDER: 0, WORKER: 0, CLIENT: 0 },
}

const emptyApprovalCounts: ApprovalCounts = { pending: 0, approved: 0, providersPending: 0 }

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
  async uploadBytes() {
    throw validationError('Storage is not configured')
  },
}

export function createUsersService(
  repository: UsersRepository,
  filesService: UsersFilesGateway = unavailableFiles,
  adminOverview?: UsersAdminOverviewGateway,
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
      throw conflict('Suspended accounts are changed from Users, not Approvals', 'USER_SUSPENDED')
    }
    return user
  }

  return {
    async listUsers(query, actor) {
      assertAdmin(actor)
      const [{ users, total }, counts] = await Promise.all([
        repository.findMany(query),
        query.counts === false
          ? Promise.resolve(emptyDirectoryCounts)
          : repository.countDirectory(),
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

    async listLookup(query, actor) {
      assertAdmin(actor)
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

    async getAdminOverview(actor) {
      if (!isAdmin(actor.roles)) {
        throw forbidden('Only admins can view the admin overview')
      }
      if (!adminOverview) {
        throw validationError('Admin overview is not configured')
      }
      const { providers, listings, projects, reviews } = adminOverview
      const [directory, approvals, providerCounts, listingCounts, reviewCounts, recent] =
        await Promise.all([
          repository.countDirectory(),
          repository.countApprovals(),
          providers.countProvidersByStatus(),
          listings.countListingsByStatus(),
          reviews.countReviewsByStatus(),
          projects.listProjects({ page: 1, limit: RECENT_PROJECTS_LIMIT }, actor),
        ])
      return {
        users: directory.accounts,
        providers: providerCounts.PENDING + providerCounts.APPROVED + providerCounts.SUSPENDED,
        pendingProviders: providerCounts.PENDING,
        projects: recent.meta.total,
        listings: listingCounts.ACTIVE + listingCounts.INACTIVE,
        pendingRequests: approvals.pending,
        pendingReviews: reviewCounts.PENDING,
        recentProjects: recent.data,
      }
    },

    async getUserById(id) {
      return loadOrThrow(id)
    },

    assertAccessible,

    async getUserWithAvatar(id, actor) {
      const user = await assertAccessible(id, actor)
      return resolveAvatar(user, actor)
    },

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

      let nextIsVerified = input.isVerified
      let nextVerificationStatus: 'UNVERIFIED' | 'REQUESTED' | 'VERIFIED' | undefined

      if (input.isVerified === true) {
        nextIsVerified = true
        nextVerificationStatus = 'VERIFIED'
      } else if (input.isVerified === false) {
        nextIsVerified = false
        // Do not clear an in-flight verification request via the boolean toggle.
        nextVerificationStatus =
          user.verificationStatus === 'REQUESTED' ? 'REQUESTED' : 'UNVERIFIED'
      }

      const leavingWorkerRole =
        user.role === 'WORKER' && input.role !== undefined && input.role !== 'WORKER'

      const updated = await repository.update(
        id,
        {
          role: input.role,
          status: input.status,
          isVerified: nextIsVerified,
          verificationStatus: nextVerificationStatus,
          profile: {
            firstName: input.firstName,
            lastName: input.lastName,
            displayName: input.displayName,
            phone: input.phone,
          },
        },
        { deleteWorkerProfile: leavingWorkerRole },
      )
      if (input.role !== undefined || input.status !== undefined) {
        invalidateAccessPrincipal(id)
      }
      return updated
    },

    async setAvatar(id, input, actor) {
      const user = await assertAccessible(id, actor)
      const file = await filesService.requireReadyAttachment(input.fileId, 'USER', id)
      if (!isAllowedImageMime(file.mime)) {
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

    async uploadAvatar(id, file, actor) {
      const user = await assertAccessible(id, actor)
      assertAllowedImageUpload(file, { maxBytes: MAX_BRAND_IMAGE_BYTES })

      const uploaded = await filesService.uploadBytes(actor, {
        entityType: 'USER',
        entityId: id,
        mime: file.mimetype,
        originalName: file.originalname || 'avatar.jpg',
        body: file.buffer,
      })

      const previousFileId = user.profile?.avatarUrl
      const updated = await repository.setAvatarFileId(id, uploaded.id)

      if (previousFileId && previousFileId !== uploaded.id) {
        try {
          await filesService.softDelete(actor, previousFileId)
        } catch {
          // Best-effort cleanup of the previous avatar object.
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
      const updated = await repository.updateStatus(id, 'INACTIVE')
      invalidateAccessPrincipal(id)
      return updated
    },

    async listApprovals(query, actor) {
      assertAdmin(actor)
      const page = query.page ?? 1
      const limit = query.limit ?? 20
      const [{ users, total }, counts] = await Promise.all([
        repository.findApprovals(query),
        query.counts === false ? Promise.resolve(emptyApprovalCounts) : repository.countApprovals(),
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
      const updated = await repository.updateStatusIf(id, 'PENDING', 'ACTIVE')
      if (!updated) {
        const again = await repository.findById(id)
        if (!again) throw notFound('User not found')
        if (again.status === 'ACTIVE') return again
        throw conflict('Only pending registrations can be approved', 'APPROVAL_NOT_PENDING')
      }
      invalidateAccessPrincipal(id)
      return updated
    },

    async unapproveUser(id, actor) {
      const user = await loadApprovalTarget(id, actor)
      if (user.status === 'PENDING') return user
      const updated = await repository.updateStatusIf(id, 'ACTIVE', 'PENDING')
      if (!updated) {
        const again = await repository.findById(id)
        if (!again) throw notFound('User not found')
        if (again.status === 'PENDING') return again
        throw conflict('Only active registrations can be unapproved', 'APPROVAL_NOT_ACTIVE')
      }
      invalidateAccessPrincipal(id)
      return updated
    },

    async deleteApproval(id, actor) {
      const user = await loadApprovalTarget(id, actor)
      if (user.status !== 'PENDING') {
        throw conflict('Only pending registrations can be deleted', 'APPROVAL_NOT_PENDING')
      }
      const result = await repository.deleteIfStatus(id, 'PENDING')
      if (result === 'status_mismatch') {
        throw conflict('Only pending registrations can be deleted', 'APPROVAL_NOT_PENDING')
      }
      if (result === 'in_use') {
        throw conflict(
          'This registration is linked to other records and cannot be deleted',
          'APPROVAL_IN_USE',
        )
      }
      invalidateAccessPrincipal(id)
    },

    async listVerifications(query, actor) {
      assertAdmin(actor)
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
        throw conflict(
          'Only workers can be removed from verification',
          'VERIFICATION_ROLE_NOT_WORKER',
        )
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
