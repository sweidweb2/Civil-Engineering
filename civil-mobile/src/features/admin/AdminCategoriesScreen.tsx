import { useMemo } from 'react'
import { router } from 'expo-router'
import { FolderTree } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { IconTile, ListCard, ListScreen, StandardListRow } from '@/components/kit'
import { useResourceList } from '@/hooks/useResourceList'
import { enumLabel, enumOptions } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import { CATEGORY_KIND_OPTIONS, type CategoryKind, listCategories } from '@/services/categories'

const PAGE_SIZE = 50
const BASE = '/admin/categories'

export function AdminCategoriesScreen() {
  const { t } = useTranslation()
  const { view, listProps } = useResourceList(
    ({ page, query, filter }) =>
      listCategories(page, PAGE_SIZE, {
        q: query || undefined,
        kind: (filter || undefined) as CategoryKind | undefined,
        includeCounts: true,
      }),
    { pageSize: PAGE_SIZE, cacheKeyPrefix: cacheKeys.categories },
  )
  const kindOptions = useMemo(() => enumOptions(t, 'categoryKind', CATEGORY_KIND_OPTIONS), [t])

  return (
    <ListScreen
      title={t('categories.title')}
      subtitle={view.total ? t('common.total', { count: view.total }) : undefined}
      backHref="/admin/more"
      searchPlaceholder={t('categories.search')}
      filterOptions={kindOptions}
      allLabel={t('common.all')}
      addLabel={t('categories.add')}
      onAdd={() => router.push(`${BASE}/new` as never)}
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <ListCard
          accessibilityLabel={item.name}
          leading={<IconTile icon={FolderTree} tone={item.isActive ? 'primary' : 'neutral'} />}
          onPress={() => router.push(`${BASE}/${item.id}` as never)}
        >
          <StandardListRow
            title={item.name}
            statusLabel={item.isActive ? t('common.active') : t('common.inactive')}
            statusTone={item.isActive ? 'success' : 'neutral'}
            subtitle={[enumLabel(t, 'categoryKind', item.kind), item.nameAr]
              .filter(Boolean)
              .join(' · ')}
          />
        </ListCard>
      )}
      loadingLabel={t('categories.loading')}
      emptyTitle={t('categories.empty')}
      {...listProps}
    />
  )
}
