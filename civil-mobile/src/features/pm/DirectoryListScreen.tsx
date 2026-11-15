import { useMemo } from 'react'
import { Text } from 'react-native'
import { Package } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { ListCard, ListScreen, StandardListRow, Thumbnail } from '@/components/kit'
import { useResourceList } from '@/hooks/useResourceList'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import { formatListingPrice, type ListingType, listListings } from '@/services/listings'

const PAGE_SIZE = 20
const TYPES: ListingType[] = ['MATERIAL', 'EQUIPMENT', 'SERVICE']

/** Browse active directory listings (PM + Admin). */
export function DirectoryListScreen() {
  const { t } = useTranslation()
  const { view, listProps } = useResourceList(
    ({ page, query, filter }) =>
      listListings(page, PAGE_SIZE, {
        q: query || undefined,
        type: (filter || undefined) as ListingType | undefined,
        status: 'ACTIVE',
        counts: false,
      }),
    { pageSize: PAGE_SIZE, cacheKeyPrefix: cacheKeys.directory },
  )
  const typeOptions = useMemo(
    () => TYPES.map((value) => ({ value, label: enumLabel(t, 'listingType', value) })),
    [t],
  )

  return (
    <ListScreen
      title={t('directory.title')}
      subtitle={view.total ? t('directory.active', { count: view.total }) : t('directory.browse')}
      searchPlaceholder={t('directory.search')}
      filterOptions={typeOptions}
      allLabel={t('common.all')}
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <ListCard
          showChevron={false}
          leading={<Thumbnail imageUrl={item.mainImageUrl} icon={Package} />}
        >
          <StandardListRow
            title={item.name}
            statusLabel={item.type ? enumLabel(t, 'listingType', item.type) : undefined}
            statusTone="info"
            subtitle={
              [item.providerName, item.categoryName, item.brand].filter(Boolean).join(' · ') || '—'
            }
            extra={
              <Text className="text-sm font-bold text-primary">{formatListingPrice(item)}</Text>
            }
          />
        </ListCard>
      )}
      loadingLabel={t('directory.loading')}
      emptyTitle={t('directory.empty')}
      {...listProps}
    />
  )
}
