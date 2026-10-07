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
} as const
