/** Cache / Redis key builders. Prefix locked: `civil:` */

const PREFIX = 'civil'

export const cacheKeys = {
  entity(resource: string, id: string): string {
    return `${PREFIX}:${resource}:${id}`
  },

  /** Versioned list page — bump `version` on writes that change the list. */
  listPage(
    resource: string,
    version: number | string,
    page: number,
    limit: number,
  ): string {
    return `${PREFIX}:${resource}:list:v${version}:p${page}:l${limit}`
  },

  listVersion(resource: string): string {
    return `${PREFIX}:${resource}:list:version`
  },

  userScoped(userId: string, suffix: string): string {
    return `${PREFIX}:user:${userId}:${suffix}`
  },

  rateLimit(scope: string, id: string): string {
    return `${PREFIX}:rl:${scope}:${id}`
  },

  /** Denylisted refresh token jti until natural expiry. */
  refreshDeny(jti: string): string {
    return `${PREFIX}:auth:refresh:deny:${jti}`
  },

  /** Cached R2/S3 GET presign for an object key. */
  storagePresignGet(key: string): string {
    return `${PREFIX}:storage:presign:get:${key}`
  },

  userDirectoryCounts(): string {
    return `${PREFIX}:users:counts:directory`
  },

  userApprovalCounts(): string {
    return `${PREFIX}:users:counts:approvals`
  },

  userVerificationCounts(): string {
    return `${PREFIX}:users:counts:verifications`
  },

  reviewStatusCounts(): string {
    return `${PREFIX}:reviews:counts:status`
  },
} as const
