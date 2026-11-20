import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { useToastApiError } from '@/services/toast'

/**
 * Wrap a pull-to-refresh action. `useRemoteData().refetch()` resolves `false` when
 * the request failed but the old data stayed on screen; tell the user instead of
 * failing silently. (A failure with no data already shows the screen's error state.)
 */
export function usePullToRefresh() {
  const { t } = useTranslation()
  const toastApiError = useToastApiError()

  return useCallback(
    (run: () => unknown) => {
      void Promise.resolve(run()).then((ok) => {
        if (ok === false) toastApiError(new Error(t('common.refreshFailed')))
      })
    },
    [t, toastApiError],
  )
}
