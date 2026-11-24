import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useRemoteData } from '@/hooks/useRemoteData'
import { cacheKeys, cacheTtl } from '@/lib/cacheKeys'
import { listCategories } from '@/services/categories'

export type WorkerTrade = {
  id: string
  /** Canonical (English) name — used when matching skills to categories. */
  name: string
  /** Name in the current UI language. */
  label: string
}

/** Active WORKER categories: the trade list for the Skills picker. */
export function useWorkerCategories() {
  const { i18n } = useTranslation()
  const isAr = i18n.language?.startsWith('ar') ?? false
  const load = useCallback(
    () => listCategories(1, 100, { kind: 'WORKER', includeCounts: false }),
    [],
  )
  const remote = useRemoteData(load, {
    cacheKey: `${cacheKeys.categoriesPicker}:WORKER`,
    staleTime: cacheTtl.reference,
  })

  const trades: WorkerTrade[] = useMemo(
    () =>
      remote.status === 'success'
        ? remote.data.data
            .filter((c) => c.isActive)
            .map((c) => ({ id: c.id, name: c.name, label: isAr && c.nameAr ? c.nameAr : c.name }))
        : [],
    [remote, isAr],
  )

  /** Localized label for a stored trade name (falls back to the stored text). */
  const labelForName = useCallback(
    (name: string | null | undefined) => {
      if (!name) return ''
      const hit = trades.find((t) => t.name.toLowerCase() === name.toLowerCase())
      return hit ? hit.label : name
    },
    [trades],
  )

  return {
    trades,
    labelForName,
    isLoading: remote.status !== 'success' && remote.status !== 'error',
  }
}
