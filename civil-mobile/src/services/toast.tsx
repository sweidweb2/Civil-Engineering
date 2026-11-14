import { Toast, ToastDescription, ToastTitle, useToast } from '@/components/ui/toast'
import { ApiError } from '@/services/api'

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
