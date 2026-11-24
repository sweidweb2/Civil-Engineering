import { useCallback } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { ProviderListingsScreen } from '@/features/provider/ProviderListingsScreen'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cacheKeys, cacheTtl } from '@/lib/cacheKeys'
import { getCategory } from '@/services/categories'
import { useLanguageStore } from '@/stores/languageStore'

export default function AdminCategoryListingsRoute() {
  const { t } = useTranslation()
  const isAr = useLanguageStore((s) => s.language) === 'ar'
  const params = useLocalSearchParams<{ id?: string }>()
  const categoryId = typeof params.id === 'string' ? params.id : params.id?.[0]

  const load = useCallback(async () => {
    if (!categoryId) throw new Error('Category id required')
    const r = await getCategory(categoryId)
    return r.data
  }, [categoryId])

  const remote = useRemoteData(load, {
    enabled: Boolean(categoryId),
    cacheKey: categoryId ? `${cacheKeys.categories}:${categoryId}` : undefined,
    staleTime: cacheTtl.reference,
  })

  const category = remote.status === 'success' ? remote.data : null
  const title = (isAr && category?.nameAr) || category?.name || t('listings.title')

  if (!categoryId) return null

  return (
    <ProviderListingsScreen
      basePath="/admin/listings"
      scope="admin"
      backHref="/admin/listings"
      categoryId={categoryId}
      title={title}
    />
  )
}
