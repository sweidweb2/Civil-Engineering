import type { AuthActor } from '../../authz/index.js'
import { isAdmin } from '../../authz/roles.js'
import { conflict, forbidden, notFound, validationError } from '../../errors/app-error.js'
import { type AvatarUrlResolver, resolveAvatarUrlsSafe } from '../files/avatar-urls.js'
import type { WorkersRepository } from './workers.repository.js'
import type {
  ListWorkersQuery,
  SetWorkerVisibilityBody,
  UpsertWorkerProfileBody,
} from './workers.schema.js'
import type {
  PaginatedWorkers,
  WorkerMineResult,
  WorkerProfile,
  WorkerVerificationStatus,
} from './workers.types.js'

export type WorkersService = {
  getMine: (userId: string) => Promise<WorkerMineResult>
  getByUserId: (userId: string, actor: AuthActor | null) => Promise<WorkerProfile>
  upsertMine: (userId: string, input: UpsertWorkerProfileBody) => Promise<WorkerProfile>
  deleteMine: (userId: string) => Promise<void>
  list: (query: ListWorkersQuery, actor: AuthActor | null) => Promise<PaginatedWorkers>
  requestVerification: (
    userId: string,
  ) => Promise<{ verificationStatus: Extract<WorkerVerificationStatus, 'REQUESTED'> }>
  setVisibility: (
    userId: string,
    input: SetWorkerVisibilityBody,
    actor: AuthActor,
  ) => Promise<WorkerProfile>
}

function canViewProfile(profile: WorkerProfile, actor: AuthActor | null): boolean {
  if (actor && isAdmin(actor.roles)) return true
  if (actor && actor.id === profile.userId) return true
  return (
    profile.isPublic &&
    profile.user.status === 'ACTIVE' &&
    profile.user.verificationStatus === 'VERIFIED'
  )
}

function stripInactiveSkills(profile: WorkerProfile): WorkerProfile {
  return {
    ...profile,
    skills: profile.skills.filter((skill) => skill.categoryIsActive),
  }
}

/** Account email/phone are for owner/admin only — marketplace contact is external. */
function forViewer(profile: WorkerProfile, actor: AuthActor | null): WorkerProfile {
  const isPrivileged = Boolean(actor && (isAdmin(actor.roles) || actor.id === profile.userId))
  const next = isPrivileged ? profile : stripInactiveSkills(profile)
  if (isPrivileged) return next
  return {
    ...next,
    user: {
      ...next.user,
      email: null,
      phone: null,
    },
  }
}

function hasMinimumCv(profile: WorkerProfile | null): boolean {
  if (!profile) return false
  return Boolean(
    profile.headline ||
    profile.primaryTrade ||
    profile.skills.length > 0 ||
    profile.experiences.length > 0,
  )
}

export type { AvatarUrlResolver }

export type WorkersServiceDeps = {
  resolveAvatarUrls?: AvatarUrlResolver
}

export function createWorkersService(
  repository: WorkersRepository,
  deps: WorkersServiceDeps = {},
): WorkersService {
  function avatarUrlsFor(fileIds: Array<string | null>): Promise<Map<string, string>> {
    return resolveAvatarUrlsSafe(deps.resolveAvatarUrls, fileIds)
  }

  async function withAvatarImage(profile: WorkerProfile): Promise<WorkerProfile> {
    const urls = await avatarUrlsFor([profile.user.avatarUrl])
    const avatarImageUrl = profile.user.avatarUrl
      ? (urls.get(profile.user.avatarUrl) ?? null)
      : null
    return { ...profile, user: { ...profile.user, avatarImageUrl } }
  }

  return {
    async getMine(userId) {
      const [profile, state] = await Promise.all([
        repository.findByUserId(userId),
        repository.findVerificationState(userId),
      ])
      return {
        profile: profile ? await withAvatarImage(profile) : null,
        verificationStatus: state?.verificationStatus ?? 'UNVERIFIED',
      }
    },

    async getByUserId(userId, actor) {
      const profile = await repository.findByUserId(userId)
      if (!profile) {
        throw notFound('Worker profile not found', 'WORKER_PROFILE_NOT_FOUND')
      }
      if (!canViewProfile(profile, actor)) {
        throw forbidden('Worker profile is not public', 'WORKER_PROFILE_NOT_PUBLIC')
      }
      return withAvatarImage(forViewer(profile, actor))
    },

    async upsertMine(userId, input) {
      const role = await repository.findUserRole(userId)
      if (role !== 'WORKER') {
        throw forbidden('Only workers can manage a worker CV', 'WORKER_PROFILE_ROLE_REQUIRED')
      }

      // Skill category validity + optimistic concurrency are enforced inside the write transaction.
      return repository.upsertWithChildren(userId, input)
    },

    async deleteMine(userId) {
      const existing = await repository.findByUserId(userId)
      if (!existing) {
        throw notFound('Worker profile not found', 'WORKER_PROFILE_NOT_FOUND')
      }
      await repository.deleteByUserId(userId)
    },

    async list(query, actor) {
      const admin = actor != null && isAdmin(actor.roles)
      const page = await repository.list({
        ...query,
        publicOnly: !admin,
        // Non-admins cannot filter by verification — public path already forces VERIFIED.
        verificationStatus: admin ? query.verificationStatus : undefined,
      })
      const urls = await avatarUrlsFor(page.data.map((row) => row.avatarUrl))
      return {
        ...page,
        data: page.data.map((row) => ({
          ...row,
          avatarImageUrl: row.avatarUrl ? (urls.get(row.avatarUrl) ?? null) : null,
        })),
      }
    },

    async requestVerification(userId) {
      const state = await repository.findVerificationState(userId)
      if (!state || state.role !== 'WORKER') {
        throw forbidden(
          'Only workers can request verification',
          'WORKER_VERIFICATION_ROLE_REQUIRED',
        )
      }
      if (state.verificationStatus === 'VERIFIED') {
        throw conflict('Worker is already verified', 'WORKER_ALREADY_VERIFIED')
      }
      if (state.verificationStatus === 'REQUESTED') {
        return { verificationStatus: 'REQUESTED' as const }
      }

      const profile = await repository.findByUserId(userId)
      if (!hasMinimumCv(profile)) {
        throw validationError(
          'Add a headline, trade, skill, or experience before requesting verification',
          { code: 'WORKER_VERIFICATION_CV_INCOMPLETE' },
        )
      }

      await repository.setVerificationRequested(userId)
      return { verificationStatus: 'REQUESTED' as const }
    },

    async setVisibility(userId, input, actor) {
      if (!isAdmin(actor.roles)) {
        throw forbidden('Only admins can change worker visibility', 'WORKER_VISIBILITY_ADMIN_ONLY')
      }
      const role = await repository.findUserRole(userId)
      if (role !== 'WORKER') {
        throw validationError('Visibility can only be set for worker accounts', {
          code: 'WORKER_VISIBILITY_ROLE_REQUIRED',
        })
      }
      const existing = await repository.findByUserId(userId)
      if (!existing) {
        return repository.ensureProfileWithVisibility(userId, input.isPublic)
      }
      return repository.updateVisibility(userId, input.isPublic)
    },
  }
}
