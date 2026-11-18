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
      placement: 'top',
      duration: 2500,
      render: ({ id }: { id: string }) => (
        <Toast nativeID={`toast-${id}`} action="success" variant="solid">
          <View className="flex-row items-center gap-3">
            <CircleCheck size={22} color={colors.success} />
            <View className="min-w-0 flex-1 gap-1">
              <ToastTitle>{title}</ToastTitle>
              {description ? <ToastDescription>{description}</ToastDescription> : null}
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

  return function toastApiError(error: unknown, fallback = 'Something went wrong') {
    const message =
      error instanceof ApiError ? error.message : error instanceof Error ? error.message : fallback

    toast.show({
      placement: 'top',
      duration: 4000,
      render: ({ id }: { id: string }) => (
        <Toast nativeID={`toast-${id}`} action="error" variant="solid">
          <View className="flex-row items-center gap-3">
            <CircleAlert size={22} color={colors.error} />
            <View className="min-w-0 flex-1 gap-1">
              <ToastTitle>{t('common.error')}</ToastTitle>
              <ToastDescription>{message}</ToastDescription>
            </View>
          </View>
        </Toast>
      ),
    })
  }
}
