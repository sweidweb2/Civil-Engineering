import { Toast, ToastDescription, ToastTitle, useToast } from '@/components/ui/toast'
import { ApiError } from '@/services/api'
import { showApiAlert } from '@/services/feedback'

/** Hook helper for quick, non-blocking success confirmations. */
export function useToastSuccess() {
  const toast = useToast()

  return function toastSuccess(title: string, description?: string) {
    toast.show({
      placement: 'top',
      duration: 2500,
      render: ({ id }: { id: string }) => (
        <Toast nativeID={`toast-${id}`} action="success" variant="solid">
          <ToastTitle>{title}</ToastTitle>
          {description ? <ToastDescription>{description}</ToastDescription> : null}
        </Toast>
      ),
    })
  }
}

/**
 * Hook helper for non-blocking API / mutation failures.
 * Prefer this over Alert for quick failures.
 */
export function useToastApiError() {
  const toast = useToast()

  return function toastApiError(error: unknown, fallback = 'Something went wrong') {
    const message =
      error instanceof ApiError ? error.message : error instanceof Error ? error.message : fallback

    toast.show({
      placement: 'top',
      duration: 4000,
      render: ({ id }: { id: string }) => (
        <Toast nativeID={`toast-${id}`} action="error" variant="solid">
          <ToastTitle>Error</ToastTitle>
          <ToastDescription>{message}</ToastDescription>
        </Toast>
      ),
    })
  }
}

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
