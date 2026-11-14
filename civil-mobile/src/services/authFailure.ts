import { router } from 'expo-router'

import { ApiError } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

/**
 * On 401/403: clear session and send user to login.
 * Call from feature screens / hooks when a protected request fails.
 */
export async function handleAuthFailure(error: unknown): Promise<boolean> {
  if (!(error instanceof ApiError)) return false
  if (error.status !== 401 && error.status !== 403) return false

  await useAuthStore
    .getState()
    .logout()
    .catch(() => {
      useAuthStore.setState({ user: null, tokens: null })
    })
  router.replace('/login')
  return true
}
