import { useCallback } from 'react'
import { Image } from 'expo-image'

import { useRemoteData } from '@/hooks/useRemoteData'
import { cacheKeys } from '@/lib/cacheKeys'
import { REMOTE_IMAGE_CACHE_POLICY, remoteImage } from '@/lib/imageSource'
import { getUserAvatarUrl } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

/**
 * Signed-in user's avatar URL (null while loading / when none is set).
 * The session user carries no avatar id, so this asks `GET /users/:id/avatar`.
 */
export function useMyAvatarUrl(): string | null {
  const userId = useAuthStore((s) => s.user?.id)
  const load = useCallback(
    async () => (userId ? (await getUserAvatarUrl(userId)).data.avatarDownloadUrl : null),
    [userId],
  )
  const remote = useRemoteData(load, {
    enabled: Boolean(userId),
    cacheKey: userId ? `${cacheKeys.myAvatar}:${userId}` : undefined,
  })
  return remote.status === 'success' ? remote.data : null
}

/**
 * The signed-in user's photo, filling its (overflow-hidden) parent over the initials.
 * Renders nothing until a photo exists, so the initials underneath stay the fallback.
 */
export function MyAvatarPhoto() {
  const url = useMyAvatarUrl()
  if (!url) return null
  // Presigned query strings change per request; the object path is the stable content key.
  const cacheKey = url.split('?')[0]
  return (
    <Image
      source={remoteImage(url, cacheKey)}
      cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      contentFit="cover"
    />
  )
}
