import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { Package } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { ListCard, ListScreen, StandardListRow, Thumbnail } from '@/components/kit'
import { useResourceList } from '@/hooks/useResourceList'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import { formatListingPrice, listListings } from '@/services/listings'

const PAGE_SIZE = 20

type ListingsListScreenProps = {
  basePath?: string
  /** `mine` scopes to the signed-in provider; `admin` lists all. */
  scope?: 'mine' | 'admin'
}

/**
 * Shared listings list for Provider and Admin portals.
 * Provider-role API auto-scopes to the signed-in provider — no `/providers/me` prefetch.
 */
export function ListingsListScreen({
  basePath = '/provider/listings',
  scope = 'mine',
}: ListingsListScreenProps) {
  const { t } = useTranslation()
  const isAdmin = scope === 'admin'

  const { listProps } = useResourceList(
    ({ page, query }) =>
      listListings(page, PAGE_SIZE, {
        q: query || undefined,
        counts: false,
      }),
    {
      pageSize: PAGE_SIZE,
      cacheKeyPrefix: isAdmin ? cacheKeys.listingsAdmin : cacheKeys.listingsMine,
    },
  )

  return (
    <View className="flex-1" testID="e2e-provider-listings">
      <ListScreen
        title={t('listings.title')}
        backHref={isAdmin ? '/admin/more' : undefined}
        searchPlaceholder={t('listings.search')}
        keyExtractor={(item) => item.id}
        renderItem={(item) => (
          <ListCard
            accessibilityLabel={item.name}
            leading={<Thumbnail imageUrl={item.mainImageUrl} icon={Package} />}
            onPress={() => router.push(`${basePath}/${item.id}` as never)}
          >
            <StandardListRow
              title={item.name}
              statusLabel={item.status === 'ACTIVE' ? t('common.active') : t('common.inactive')}
              statusTone={item.status === 'ACTIVE' ? 'success' : 'neutral'}
              subtitle={
                [
                  item.type ? enumLabel(t, 'listingType', item.type) : null,
                  item.categoryName,
                  item.brand,
                ]
                  .filter(Boolean)
                  .join(' · ') || '—'
              }
              extra={
                <Text className="text-sm font-bold text-primary">{formatListingPrice(item)}</Text>
              }
            />
          </ListCard>
        )}
        loadingLabel={t('listings.loading')}
        emptyTitle={t(isAdmin ? 'listings.emptyAdmin' : 'listings.empty')}
        emptyDescription={t('listings.emptyHint')}
        {...listProps}
      />
    </View>
  )
}
