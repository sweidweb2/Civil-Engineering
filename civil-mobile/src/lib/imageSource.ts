import type { ImageSource } from 'expo-image'

/**
 * Source for a remote image whose URL may change per request (presigned R2 URLs get a
 * new signature on every API response). `cacheKey` is a stable id for the *content*
 * (gallery `storagePath`, `mainImageKey`, provider `logoUrl` key, avatar file id), so
 * expo-image's memory/disk cache keeps hitting across refetches. Replacing an image
 * always produces a new key, so a key never maps to outdated content.
 *
 * Without a key (local picker files, unknown sources) it falls back to URL caching.
 */
export function remoteImage(uri: string, cacheKey?: string | null): ImageSource {
  return cacheKey ? { uri, cacheKey } : { uri }
}

/** expo-image cache policy for remote content: keep decoded images in memory and files on disk. */
export const REMOTE_IMAGE_CACHE_POLICY = 'memory-disk' as const

/**
 * True for a loadable http(s) URL. Some API fields hold a storage reference instead
 * (provider `logoUrl` is usually an R2 key, profile `avatarUrl` is a File id); those
 * must not be passed to `<Image>` — list screens show initials, like civil-web.
 */
export function isHttpUrl(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}
