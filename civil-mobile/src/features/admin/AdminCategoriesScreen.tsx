import { useCallback, useMemo } from 'react'
import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { FolderTree } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { IconTile, ListCard, ListScreen, StatusPill } from '@/components/kit'
import { listView, useListState } from '@/hooks/useListState'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel, enumOptions } from '@/i18n/labels'
import { CATEGORY_KIND_OPTIONS, type CategoryKind, listCategories } from '@/services/categories'

const PAGE_SIZE = 50
const BASE = '/admin/categories'

export function AdminCategoriesScreen() {
  const { t } = useTranslation()
  const list = useListState()

  const load = useCallback(
    () =>
      listCategories(list.page, PAGE_SIZE, {
        q: list.appliedQuery || undefined,
        kind: (list.filter || undefined) as CategoryKind | undefined,
        includeCounts: true,
      }),
    [list.appliedQuery, list.filter, list.page],
  )
  const remote = useRemoteData(load)
  const view = listView(remote, PAGE_SIZE)
  const kindOptions = useMemo(() => enumOptions(t, 'categoryKind', CATEGORY_KIND_OPTIONS), [t])

  return (
    <ListScreen
      title={t('categories.title')}
      subtitle={view.total ? t('common.total', { count: view.total }) : undefined}
      backHref="/admin/more"
      searchPlaceholder={t('categories.search')}
      query={list.query}
      onQueryChange={list.setQuery}
      onSearch={list.onSearch}
      filterOptions={kindOptions}
      filterValue={list.filter}
      onFilterChange={list.onFilter}
      allLabel={t('common.all')}
      addLabel={t('categories.add')}
      onAdd={() => router.push(`${BASE}/new` as never)}
      data={view.rows}
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <ListCard
          accessibilityLabel={item.name}
          leading={<IconTile icon={FolderTree} tone={item.isActive ? 'primary' : 'neutral'} />}
          onPress={() => router.push(`${BASE}/${item.id}` as never)}
        >
          <View className="flex-row items-start justify-between gap-2">
            <Text className="min-w-0 flex-1 text-base font-bold text-foreground" numberOfLines={1}>
              {item.name}
            </Text>
            <StatusPill
              label={item.isActive ? t('common.active') : t('common.inactive')}
              tone={item.isActive ? 'success' : 'neutral'}
            />
          </View>
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {[enumLabel(t, 'categoryKind', item.kind), item.nameAr].filter(Boolean).join(' · ')}
          </Text>
        </ListCard>
      )}
      isInitialLoading={view.isInitialLoading}
      isRefreshing={view.isRefreshing}
      error={view.error}
      onRefresh={() => void remote.refetch()}
      loadingLabel={t('categories.loading')}
      page={list.page}
      totalPages={view.totalPages}
      onPageChange={list.setPage}
      emptyTitle={t('categories.empty')}
    />
  )
}
