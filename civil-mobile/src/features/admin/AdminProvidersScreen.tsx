import { useCallback, useMemo } from 'react'
import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { Store } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { ListCard, ListScreen, StatusPill, Thumbnail, toneForStatus } from '@/components/kit'
import { listView, useListState } from '@/hooks/useListState'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel, enumOptions } from '@/i18n/labels'
import { listProviders, PROVIDER_STATUS_OPTIONS, type ProviderStatus } from '@/services/providers'

const PAGE_SIZE = 20
const BASE = '/admin/providers'

export function AdminProvidersScreen() {
  const { t } = useTranslation()
  const list = useListState()

  const load = useCallback(
    () =>
      listProviders(
        list.page,
        PAGE_SIZE,
        list.appliedQuery || undefined,
        (list.filter || undefined) as ProviderStatus | undefined,
      ),
    [list.appliedQuery, list.filter, list.page],
  )
  const remote = useRemoteData(load)
  const view = listView(remote, PAGE_SIZE)
  const statusOptions = useMemo(
    () => enumOptions(t, 'providerStatus', PROVIDER_STATUS_OPTIONS),
    [t],
  )

  return (
    <ListScreen
      title={t('providers.title')}
      subtitle={view.total ? t('common.total', { count: view.total }) : undefined}
      searchPlaceholder={t('providers.search')}
      query={list.query}
      onQueryChange={list.setQuery}
      onSearch={list.onSearch}
      filterOptions={statusOptions}
      filterValue={list.filter}
      onFilterChange={list.onFilter}
      allLabel={t('common.all')}
      addLabel={t('providers.add')}
      onAdd={() => router.push(`${BASE}/new` as never)}
      data={view.rows}
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <ListCard
          accessibilityLabel={item.name}
          leading={<Thumbnail imageUrl={item.logoUrl} icon={Store} />}
          onPress={() => router.push(`${BASE}/${item.id}` as never)}
        >
          <View className="flex-row items-start justify-between gap-2">
            <Text className="min-w-0 flex-1 text-base font-bold text-foreground" numberOfLines={1}>
              {item.name}
            </Text>
            <StatusPill
              label={enumLabel(t, 'providerStatus', item.status)}
              tone={toneForStatus(item.status)}
            />
          </View>
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {[item.city, item.email, item.phone].filter(Boolean).join(' · ') || '—'}
          </Text>
        </ListCard>
      )}
      isInitialLoading={view.isInitialLoading}
      isRefreshing={view.isRefreshing}
      error={view.error}
      onRefresh={() => void remote.refetch()}
      loadingLabel={t('providers.loading')}
      page={list.page}
      totalPages={view.totalPages}
      onPageChange={list.setPage}
      emptyTitle={t('providers.empty')}
    />
  )
}
