import { useCallback, useMemo } from 'react'
import { Text, View } from 'react-native'
import { Package } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { ListCard, ListScreen, StatusPill, Thumbnail } from '@/components/kit'
import { listView, useListState } from '@/hooks/useListState'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel } from '@/i18n/labels'
import { formatListingPrice, type ListingType, listListings } from '@/services/listings'

const PAGE_SIZE = 20
const TYPES: ListingType[] = ['MATERIAL', 'EQUIPMENT', 'SERVICE']

export function PmDirectoryScreen() {
  const { t } = useTranslation()
  const list = useListState()

  const load = useCallback(
    () =>
      listListings(list.page, PAGE_SIZE, {
        q: list.appliedQuery || undefined,
        type: (list.filter || undefined) as ListingType | undefined,
        status: 'ACTIVE',
        counts: false,
      }),
    [list.appliedQuery, list.filter, list.page],
  )
  const remote = useRemoteData(load)
  const view = listView(remote, PAGE_SIZE)
  const typeOptions = useMemo(
    () => TYPES.map((value) => ({ value, label: enumLabel(t, 'listingType', value) })),
    [t],
  )

  return (
    <ListScreen
      title={t('directory.title')}
      subtitle={view.total ? t('directory.active', { count: view.total }) : t('directory.browse')}
      searchPlaceholder={t('directory.search')}
      query={list.query}
      onQueryChange={list.setQuery}
      onSearch={list.onSearch}
      filterOptions={typeOptions}
      filterValue={list.filter}
      onFilterChange={list.onFilter}
      allLabel={t('common.all')}
      data={view.rows}
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <ListCard
          showChevron={false}
          leading={<Thumbnail imageUrl={item.mainImageUrl} icon={Package} />}
        >
          <View className="flex-row items-start justify-between gap-2">
            <Text className="min-w-0 flex-1 text-base font-bold text-foreground" numberOfLines={1}>
              {item.name}
            </Text>
            {item.type ? (
              <StatusPill label={enumLabel(t, 'listingType', item.type)} tone="info" />
            ) : null}
          </View>
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {[item.providerName, item.categoryName, item.brand].filter(Boolean).join(' · ') || '—'}
          </Text>
          <Text className="text-sm font-bold text-primary">{formatListingPrice(item)}</Text>
        </ListCard>
      )}
      isInitialLoading={view.isInitialLoading}
      isRefreshing={view.isRefreshing}
      error={view.error}
      onRefresh={() => void remote.refetch()}
      loadingLabel={t('directory.loading')}
      page={list.page}
      totalPages={view.totalPages}
      onPageChange={list.setPage}
      emptyTitle={t('directory.empty')}
    />
  )
}
