import { ApiError } from '@/services/api'
import { showApiAlert } from '@/services/feedback'
import { useToastApiError } from '@/services/toast'

/**
 * Server errors (≥500) toast; client/validation errors use a blocking alert.
 * Use this in mutation catch blocks instead of duplicating the branch.
 */
export function useHandleApiError() {
  const toastApiError = useToastApiError()

  return function handleApiError(error: unknown, title: string, fallback?: string) {
    if (error instanceof ApiError && error.status >= 500) {
      toastApiError(error, fallback)
    } else {
      showApiAlert(error, title, fallback)
    }
  }
}
