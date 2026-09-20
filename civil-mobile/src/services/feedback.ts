import { Alert } from 'react-native'

import { ApiError } from '@/services/api'

export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

/**
 * Blocking confirm / failure dialog (mobile equivalent of Alert Dialog).
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
  const buttons: {
    text: string
    style?: 'cancel' | 'destructive' | 'default'
    onPress?: () => void
  }[] = []

  if (options?.cancelLabel || options?.onCancel) {
    buttons.push({
      text: options.cancelLabel ?? 'Cancel',
      style: 'cancel',
      onPress: options.onCancel,
    })
  }

  buttons.push({
    text: options?.confirmLabel ?? 'OK',
    onPress: options?.onConfirm,
  })

  Alert.alert(title, message, buttons)
}

export function showApiAlert(
  error: unknown,
  title = 'Request failed',
  fallback = 'Something went wrong',
) {
  showBlockingAlert(title, errorMessage(error, fallback))
}
