import { View } from 'react-native'
import { CircleAlert, CircleCheck } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { Toast, ToastDescription, ToastTitle, useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/hooks/useThemeColors'
import { ApiError } from '@/services/api'

/** Hook helper for quick, non-blocking success confirmations. */
export function useToastSuccess() {
  const toast = useToast()
  const colors = useThemeColors()

  return function toastSuccess(title: string, description?: string) {
    toast.show({
      placement: 'bottom',
      duration: 4000,
      render: ({ id }: { id: string }) => (
        <Toast nativeID={`toast-${id}`} action="success" variant="solid">
          <View className="flex-row items-center gap-3">
            <CircleCheck size={20} color={colors.accentOnInverse} strokeWidth={1.75} />
            <View className="min-w-0 flex-1 gap-1">
              <ToastTitle size="sm">{title}</ToastTitle>
              {description ? <ToastDescription size="sm">{description}</ToastDescription> : null}
            </View>
          </View>
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
  const colors = useThemeColors()
  const { t } = useTranslation()

  return function toastApiError(error: unknown, fallback = t('common.toastFailed')) {
    const message =
      error instanceof ApiError ? error.message : error instanceof Error ? error.message : fallback

    toast.show({
      placement: 'bottom',
      duration: 4000,
      render: ({ id }: { id: string }) => (
        <Toast nativeID={`toast-${id}`} action="error" variant="solid">
          <View className="flex-row items-center gap-3">
            <CircleAlert size={20} color={colors.onInverse} strokeWidth={1.75} />
            <View className="min-w-0 flex-1 gap-1">
              <ToastTitle size="sm">{t('common.error')}</ToastTitle>
              <ToastDescription size="sm">{message}</ToastDescription>
            </View>
          </View>
        </Toast>
      ),
    })
  }
}
