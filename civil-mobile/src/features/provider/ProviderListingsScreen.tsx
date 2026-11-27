import { useEffect, useMemo } from 'react'
import { FlatList, RefreshControl, ScrollView, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Package, Plus, RotateCcw } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { ListingGridCard, ListingGridSkeleton } from '@/features/provider/ui/kit'
import { WkGridRow, WkGridSpacer } from '@/components/wk/GridCard'
import { WkButton, WkError, WkHeroGlow, WkTopBar } from '@/components/wk/kit'
import { PagedListFooter } from '@/components/wk/PagedListFooter'
import { useWkPalette, WK_TAB_SPACE } from '@/components/wk/palette'
import { WkSearchAddButton, WkSearchField } from '@/components/wk/SearchField'
import { usePagedList } from '@/components/wk/usePagedList'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { cacheKeys } from '@/lib/cacheKeys'
import { LIST_PERF } from '@/lib/listPerf'
import { toPairs } from '@/lib/pagedRows'
import { errorMessage } from '@/services/feedback'
import {
  type Listing,
  type ListingStatus,
  type ListingStatusCounts,
  listListings,
} from '@/services/listings'
import { MONO_STYLE } from '@/theme/typography'

const PAGE_SIZE = 24
type Filter = 'ALL' | ListingStatus

function parseFilter(value: unknown): Filter {
  return value === 'ACTIVE' || value === 'INACTIVE' ? value : 'ALL'
}

/**
 * Listings photo grid with search and Live / Hidden filters.
 * Provider "Listings" tab by default; admin reuses it (all providers) as a
 * pushed screen with `scope="admin"` and a back header — optionally scoped
 * to one marketplace category.
 */
export function ProviderListingsScreen({
  basePath = '/provider/listings',
  scope = 'mine',
  backHref,
  categoryId,
  title,
}: {
  basePath?: string
  scope?: 'mine' | 'admin'
  /** Shows a back header (pushed screen) instead of the tab layout. */
  backHref?: string
  /** When set, only listings in this category are shown. */
  categoryId?: string
  /** Override the top-bar title (e.g. category name). */
  title?: string
} = {}) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { c, shadow, isDark } = useWkPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')
  const params = useLocalSearchParams<{ status?: string }>()
  const pull = usePullToRefresh()

  const list = usePagedList<Listing>({
    cacheKeyPrefix: `${scope === 'admin' ? cacheKeys.listingsAdmin : cacheKeys.listingsMine}:grid:${categoryId ?? 'all'}`,
    initialFilter: parseFilter(params.status),
    resetKey: categoryId,
    fetcher: ({ page, query, filter }) =>
      listListings(page, PAGE_SIZE, {
        q: query || undefined,
        status: filter === 'ALL' || !filter ? undefined : (filter as ListingStatus),
        categoryId: categoryId || undefined,
        counts: false,
      }),
  })

  // Home stat tiles deep-link here with ?status=…
  useEffect(() => {
    if (params.status !== undefined) list.setFilter(parseFilter(params.status))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.status])

  // Status chip counts are global (not category-scoped) — hide them in a category view.
  const counts = categoryId
    ? undefined
    : (list.meta?.statusCounts as ListingStatusCounts | undefined)
  const allCount = counts ? counts.ACTIVE + counts.INACTIVE : null
  const listRows = useMemo(() => toPairs(list.rows), [list.rows])

  const filters: { value: Filter; label: string; count: number | null }[] = [
    { value: 'ALL', label: t('providerPortal.all'), count: allCount },
    { value: 'ACTIVE', label: t('providerHome.live'), count: counts?.ACTIVE ?? null },
    { value: 'INACTIVE', label: t('providerHome.hidden'), count: counts?.INACTIVE ?? null },
  ]

  const noneAtAll = !categoryId && allCount === 0
  const filter = (list.filter || 'ALL') as Filter

  const header = (
    <View className="gap-3.5 pb-3.5">
      <WkSearchField
        value={list.query}
        onChangeText={list.setQuery}
        placeholder={t('providerPortal.searchMine')}
        accessibilityLabel={t('providerPortal.searchMine')}
        onSubmit={() => {
          const next = list.query.trim()
          if (next !== list.applied) list.restart({ applied: next })
        }}
        trailing={
          <WkSearchAddButton
            label={t('providerHome.newListing')}
            onPress={() => router.push(`${basePath}/new` as never)}
          />
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-5"
        contentContainerClassName="gap-2 px-5"
        accessibilityRole="tablist"
      >
        {filters.map((f) => {
          const on = f.value === filter
          return (
            <Pressable
              key={f.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => list.setFilter(f.value)}
              className={`h-[38px] flex-row items-center gap-1.5 rounded-full border px-3.5 ${
                on ? 'border-wk-ink bg-wk-ink' : 'border-wk-line bg-wk-sf'
              }`}
            >
              <Text className={`text-[13px] font-medium ${on ? 'text-wk-bg' : 'text-wk-ink2'}`}>
                {f.label}
              </Text>
              {f.count != null ? (
                <Text
                  className={`text-[11px] font-medium ${on ? 'text-wk-bg' : 'text-wk-ink2'}`}
                  style={[MONO_STYLE, { opacity: 0.6 }]}
                >
                  {f.count}
                </Text>
              ) : null}
            </Pressable>
          )
        })}
      </ScrollView>

      {list.error && list.rows.length === 0 ? (
        <WkError
          message={errorMessage(list.error, t('common.errorGeneric'))}
          onRetry={() => void list.refetch()}
        />
      ) : null}
      {list.isFirstLoad ? <ListingGridSkeleton /> : null}
    </View>
  )

  const empty =
    !list.isFirstLoad && list.status === 'success' && list.rows.length === 0 ? (
      <Animated.View
        entering={FadeIn.duration(300)}
        className="overflow-hidden rounded-[26px] bg-wk-sf"
        style={shadow}
      >
        <View className="h-[150px] items-center justify-center overflow-hidden bg-wk-hero">
          <WkHeroGlow size={280} />
          <View
            className="size-16 items-center justify-center rounded-[20px]"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            <Package size={30} color={c.lime} strokeWidth={1.6} />
          </View>
        </View>
        <View className="items-start gap-2 px-[22px] pb-[22px] pt-5">
          <Text className="text-[17px] font-semibold text-wk-ink">
            {noneAtAll
              ? t('providerPortal.emptyFirstTitle')
              : categoryId && !list.applied && filter === 'ALL'
                ? t('pmPortal.categoryListingsEmpty')
                : t('providerPortal.noMatchTitle')}
          </Text>
          <Text className="text-[15px] leading-[22px] text-wk-ink2">
            {noneAtAll
              ? t('providerPortal.emptyFirstBody')
              : list.applied
                ? t('providerPortal.noMatchQuery', { query: list.applied })
                : categoryId && filter === 'ALL'
                  ? t('pmPortal.categoryListingsEmptyHint')
                  : filter === 'ACTIVE'
                    ? t('providerPortal.noLive')
                    : t('providerPortal.noHidden')}
          </Text>
          <View className="mt-2">
            {noneAtAll ? (
              <WkButton
                compact
                height={48}
                icon={Plus}
                label={t('providerHome.newListing')}
                onPress={() => router.push(`${basePath}/new` as never)}
              />
            ) : (
              <WkButton
                compact
                height={48}
                icon={RotateCcw}
                label={t('providerPortal.clearFilters')}
                onPress={() => list.clearAll('ALL')}
              />
            )}
          </View>
        </View>
      </Animated.View>
    ) : undefined

  return (
    <View className="flex-1 bg-wk-bg" testID="e2e-provider-listings">
      {backHref ? (
        <WkTopBar
          title={title || t('listings.title')}
          backHref={backHref}
          count={list.total ? String(list.total) : undefined}
        />
      ) : null}
      <FlatList
        data={list.isFirstLoad ? [] : listRows}
        keyExtractor={(row) => row.map((l) => l.id).join(':')}
        {...LIST_PERF}
        renderItem={({ item: row }) => (
          <WkGridRow>
            {row.map((listing) => (
              <ListingGridCard
                key={listing.id}
                listing={listing}
                onPress={() => router.push(`${basePath}/${listing.id}` as never)}
              />
            ))}
            {row.length === 1 ? <WkGridSpacer /> : null}
          </WkGridRow>
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
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
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerClassName="px-5"
        contentContainerStyle={{
          paddingTop: backHref ? 8 : insets.top + 12,
          paddingBottom: WK_TAB_SPACE + insets.bottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={list.isFetching && list.rows.length > 0 && list.page === 1}
            onRefresh={() => pull(() => list.refresh())}
            tintColor={c.ink3}
            colors={[c.brand]}
          />
        }
      />
    </View>
  )
}
