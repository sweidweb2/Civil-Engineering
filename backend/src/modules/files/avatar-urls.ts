/**
 * Resolves avatar File ids (`profiles.avatarUrl`) → loadable image URLs.
 * Ids that are missing, not READY, or fail to sign are absent from the map, so callers
 * fall back to initials instead of failing the request.
 * The DB-backed implementation lives in `avatar-url-resolver.ts` (kept apart so services
 * importing this file stay free of Prisma).
 */
export type AvatarUrlResolver = (fileIds: string[]) => Promise<Map<string, string>>

/** Dedupes ids, skips empty input, and swallows resolver failures. */
export async function resolveAvatarUrlsSafe(
  resolver: AvatarUrlResolver | undefined,
  fileIds: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const ids = [...new Set(fileIds.filter((id): id is string => Boolean(id)))]
  if (!resolver || ids.length === 0) return new Map()
  try {
    return await resolver(ids)
  } catch {
    return new Map()
  }
}
