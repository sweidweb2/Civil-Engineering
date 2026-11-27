import { useCallback } from 'react'
import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { LayoutGrid } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { WkGrid } from '@/components/wk/GridCard'
import { WkError, WkSkeletonCard, WkTopBar } from '@/components/wk/kit'
import { PagedListFooter } from '@/components/wk/PagedListFooter'
import { useWkPalette } from '@/components/wk/palette'
import { WkSearchAddButton, WkSearchField } from '@/components/wk/SearchField'
import { usePagedList } from '@/components/wk/usePagedList'
import { DesignOfferGridCard } from '@/features/design-offers/DesignOfferGridCard'
import { cacheKeys } from '@/lib/cacheKeys'
import { type DesignOffer, listDesignOffers } from '@/services/design-offers'
import { errorMessage } from '@/services/feedback'

const PAGE_SIZE = 20

type DesignOffersGridScreenProps = {
  mode: 'admin' | 'pm'
  /** When embedded under the PM designs hub, hide the top bar. */
  embedded?: boolean
  title?: string
  backHref?: string
  onSelectOffer?: (offer: DesignOffer) => void
}

/** Grid of design offers — admin CRUD entry or PM catalog browse. */
export function DesignOffersGridScreen({
  mode,
  embedded = false,
  title,
  backHref = '/admin/more',
  onSelectOffer,
}: DesignOffersGridScreenProps) {
  const { t } = useTranslation()
  const { c, shadow } = useWkPalette()

  const list = usePagedList<DesignOffer>({
    cacheKeyPrefix: `${cacheKeys.designOffers}:${mode}`,
    resetKey: mode,
    fetcher: ({ page, query }) =>
      listDesignOffers({
        page,
        limit: PAGE_SIZE,
        q: query || undefined,
        activeOnly: mode === 'admin' ? undefined : true,
      }),
  })

  const screenTitle = title ?? t('designOffers.title')

  const renderOffer = useCallback(
    (offer: DesignOffer) => (
      <DesignOfferGridCard
        offer={offer}
        showInactiveBadge={mode === 'admin'}
        onPress={() => {
          if (onSelectOffer) onSelectOffer(offer)
          else if (mode === 'admin') router.push(`/admin/design-offers/${offer.id}` as never)
          else router.push(`/pm/design-requests/new?designOfferId=${offer.id}` as never)
        }}
      />
    ),
    [mode, onSelectOffer],
  )

  const header = (
    <View className="gap-3 pb-3">
      <WkSearchField
        value={list.query}
        onChangeText={list.setQuery}
        placeholder={t('designOffers.search')}
        trailing={
          mode === 'admin' && !embedded ? (
            <WkSearchAddButton
              label={t('designOffers.add')}
              onPress={() => router.push('/admin/design-offers/new' as never)}
            />
          ) : undefined
        }
      />
      {list.error && list.rows.length === 0 ? (
        <WkError
          message={errorMessage(list.error, t('common.errorGeneric'))}
          onRetry={() => void list.refetch()}
        />
      ) : null}
      {list.isFirstLoad ? (
        <View className="flex-row gap-3">
          <View className="flex-1">
            <WkSkeletonCard />
          </View>
          <View className="flex-1">
            <WkSkeletonCard />
          </View>
        </View>
      ) : null}
    </View>
  )

  const empty =
    !list.isFirstLoad && list.status === 'success' && list.rows.length === 0 ? (
      <View className="items-center gap-2.5 px-6 py-10">
        <View
          className="size-16 items-center justify-center rounded-[20px] bg-wk-sf"
          style={shadow}
        >
          <LayoutGrid size={28} color={c.brand} strokeWidth={1.75} />
        </View>
        <Text className="mt-1.5 text-[17px] font-semibold text-wk-ink">
          {list.applied ? t('designOffers.emptySearch') : t('designOffers.empty')}
        </Text>
        <Text className="max-w-[260px] text-center text-[15px] leading-[22px] text-wk-ink2">
          {list.applied ? t('designOffers.emptySearchHint') : t('designOffers.emptyHint')}
        </Text>
      </View>
    ) : undefined

  const body = (
    <WkGrid
      data={list.isFirstLoad ? [] : list.rows}
      renderCard={renderOffer}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={
        <PagedListFooter
          rowCount={list.rows.length}
          hasMore={list.hasMore}
          isFetching={list.isFetching}
          error={list.error}
          onLoadMore={list.loadMore}
        />
      }
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    />
  )

  if (embedded) return <View className="flex-1 bg-wk-bg">{body}</View>

  return (
    <View className="flex-1 bg-wk-bg">
      <WkTopBar
        title={screenTitle}
        backHref={backHref}
        count={list.total ? String(list.total) : undefined}
      />
      {body}
    </View>
  )
}
