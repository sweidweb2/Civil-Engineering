import { useCallback } from 'react'
import { router } from 'expo-router'
import { FolderTree } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { usePagedList, WkListRow, WkListScreen } from '@/components/wk/list'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import {
  type Category,
  CATEGORY_KIND_OPTIONS,
  type CategoryKind,
  listCategories,
} from '@/services/categories'

const PAGE_SIZE = 50
const BASE = '/admin/categories'

/** Admin → More → Categories: kind chips, active pill, Arabic name. */
export function AdminCategoriesScreen() {
  const { t } = useTranslation()
  const list = usePagedList({
    cacheKeyPrefix: cacheKeys.categories,
    fetcher: ({ page, query, filter }) =>
      listCategories(page, PAGE_SIZE, {
        q: query || undefined,
        kind: (filter || undefined) as CategoryKind | undefined,
        includeCounts: true,
      }),
  })

  const renderRow = useCallback(
    (cat: Category) => (
      <WkListRow
        title={cat.name}
        pill={
          cat.isActive
            ? { label: t('common.active'), tone: 'green' }
            : { label: t('common.inactive'), tone: 'neutral' }
        }
        sub={[
          enumLabel(t, 'categoryKind', cat.kind),
          cat.parentName ? t('categories.under', { parent: cat.parentName }) : null,
          cat.nameAr,
        ]
          .filter(Boolean)
          .join(' · ')}
        sub2={
          cat.listingCount != null
            ? t('adminPortal.listingCount', { count: cat.listingCount })
            : null
        }
        onPress={() => router.push(`${BASE}/${cat.id}` as never)}
      />
    ),
    [t],
  )

  return (
    <WkListScreen
      testID="e2e-admin-categories"
      list={list}
      title={t('categories.title')}
      backHref="/admin/more"
      searchPlaceholder={t('categories.search')}
      onAdd={() => router.push(`${BASE}/new` as never)}
      addLabel={t('categories.add')}
      filters={[
        { value: '', label: t('providerPortal.all') },
        ...CATEGORY_KIND_OPTIONS.map((o) => ({
          value: o.value,
          label: enumLabel(t, 'categoryKind', o.value),
        })),
      ]}
      emptyIcon={FolderTree}
      emptyTitle={t('categories.empty')}
      renderItem={renderRow}
    />
  )
}
