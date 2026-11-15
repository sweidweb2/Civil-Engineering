import { ApiError } from '@/services/api'
import { useAlertStore } from '@/stores/alertStore'

export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

/**
 * In-app confirm / message dialog (works on native + web).
 * Never uses window.alert / window.confirm.
 */
export function showBlockingAlert(
  title: string,
  message: string,
  options?: {
    confirmLabel?: string
    cancelLabel?: string
    onConfirm?: () => void
    onCancel?: () => void
  },
) {
  useAlertStore.getState().show({
    title,
    message,
    confirmLabel: options?.confirmLabel,
    cancelLabel: options?.cancelLabel,
    onConfirm: options?.onConfirm,
    onCancel: options?.onCancel,
  })
}

export function showApiAlert(
  error: unknown,
  title = 'Request failed',
  fallback = 'Something went wrong',
) {
  showBlockingAlert(title, errorMessage(error, fallback))
}
