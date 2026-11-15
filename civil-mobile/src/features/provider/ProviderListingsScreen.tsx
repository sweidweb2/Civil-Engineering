import { useCallback, useMemo } from 'react'
import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { Package } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { ListCard, ListScreen, StatusPill, Thumbnail } from '@/components/kit'
import { listView, useListState } from '@/hooks/useListState'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel } from '@/i18n/labels'
import { formatListingPrice, listListings } from '@/services/listings'
import { getMyProvider } from '@/services/providers'

const PAGE_SIZE = 20

type ProviderListingsScreenProps = {
  basePath?: string
  /** `mine` scopes to the signed-in provider; `admin` lists all. */
  scope?: 'mine' | 'admin'
}

export function ProviderListingsScreen({
  basePath = '/provider/listings',
  scope = 'mine',
}: ProviderListingsScreenProps) {
  const { t } = useTranslation()
  const list = useListState()
  const isAdmin = scope === 'admin'

  const loadMine = useCallback(() => getMyProvider(), [])
  const mineRemote = useRemoteData(loadMine, { enabled: !isAdmin })
  const providerId = mineRemote.status === 'success' ? mineRemote.data.data.id : undefined

  const loadListings = useCallback(() => {
    if (!isAdmin && !providerId) return Promise.reject(new Error('Provider not loaded'))
    return listListings(list.page, PAGE_SIZE, {
      providerId: isAdmin ? undefined : providerId,
      q: list.appliedQuery || undefined,
      counts: false,
    })
  }, [list.appliedQuery, isAdmin, list.page, providerId])

  const listingsRemote = useRemoteData(loadListings, {
    enabled: isAdmin || Boolean(providerId),
  })
  const view = listView(listingsRemote, PAGE_SIZE)

  const mineLoading = !isAdmin && mineRemote.isLoading
  const error = !isAdmin && mineRemote.status === 'error' ? mineRemote.error : view.error
  const onRetry = useMemo(
    () => () => {
      if (!isAdmin) void mineRemote.refetch()
      if (isAdmin || providerId) void listingsRemote.refetch()
    },
    [isAdmin, listingsRemote, mineRemote, providerId],
  )

  return (
    <View className="flex-1" testID="e2e-provider-listings">
      <ListScreen
        title={t('listings.title')}
        subtitle={view.total ? t('common.total', { count: view.total }) : undefined}
        backHref={isAdmin ? '/admin/more' : undefined}
        searchPlaceholder={t('listings.search')}
        query={list.query}
        onQueryChange={list.setQuery}
        onSearch={list.onSearch}
        addLabel={t('listings.add')}
        onAdd={() => router.push(`${basePath}/new` as never)}
        data={view.rows}
        keyExtractor={(item) => item.id}
        renderItem={(item) => (
          <ListCard
            accessibilityLabel={item.name}
            leading={<Thumbnail imageUrl={item.mainImageUrl} icon={Package} />}
            onPress={() => router.push(`${basePath}/${item.id}` as never)}
          >
            <View className="flex-row items-start justify-between gap-2">
              <Text
                className="min-w-0 flex-1 text-base font-bold text-foreground"
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <StatusPill
                label={item.status === 'ACTIVE' ? t('common.active') : t('common.inactive')}
                tone={item.status === 'ACTIVE' ? 'success' : 'neutral'}
              />
            </View>
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {[
                item.type ? enumLabel(t, 'listingType', item.type) : null,
                item.categoryName,
                item.brand,
              ]
                .filter(Boolean)
                .join(' · ') || '—'}
            </Text>
            <Text className="text-sm font-bold text-primary">{formatListingPrice(item)}</Text>
          </ListCard>
        )}
        isInitialLoading={mineLoading || view.isInitialLoading}
        isRefreshing={view.isRefreshing}
        error={error}
        onRefresh={onRetry}
        loadingLabel={t('listings.loading')}
        page={list.page}
        totalPages={view.totalPages}
        onPageChange={list.setPage}
        emptyTitle={t(isAdmin ? 'listings.emptyAdmin' : 'listings.empty')}
        emptyDescription={t('listings.emptyHint')}
      />
    </View>
  )
}
