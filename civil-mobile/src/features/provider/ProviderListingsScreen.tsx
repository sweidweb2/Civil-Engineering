import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Package, Plus, RotateCcw, Search, X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { ListingGridCard, ListingGridSkeleton } from '@/features/provider/ui/kit'
import { WkButton, WkError, WkHeroGlow, WkTopBar } from '@/features/worker/ui/kit'
import { useWorkerPalette, WK_TAB_SPACE } from '@/features/worker/ui/palette'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cacheKeys } from '@/lib/cacheKeys'
import { mergePageRows } from '@/lib/pagedRows'
import { errorMessage } from '@/services/feedback'
import { type Listing, type ListingStatus, listListings } from '@/services/listings'
import { MONO_STYLE } from '@/theme/typography'

const PAGE_SIZE = 24
type Filter = 'ALL' | ListingStatus

function parseFilter(value: unknown): Filter {
  return value === 'ACTIVE' || value === 'INACTIVE' ? value : 'ALL'
}

/** Two cards per row; an odd last card keeps half width. */
function toRows(items: Listing[]): Listing[][] {
  const rows: Listing[][] = []
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2))
  return rows
}

/**
 * Listings photo grid with search and Live / Hidden filters.
 * Provider "Listings" tab by default; admin reuses it (all providers) as a
 * pushed screen with `scope="admin"` and a back header.
 */
export function ProviderListingsScreen({
  basePath = '/provider/listings',
  scope = 'mine',
  backHref,
}: {
  basePath?: string
  scope?: 'mine' | 'admin'
  /** Shows a back header (pushed screen) instead of the tab layout. */
  backHref?: string
} = {}) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { c, shadow, isDark } = useWorkerPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')
  const params = useLocalSearchParams<{ status?: string }>()

  const [filter, setFilter] = useState<Filter>(() => parseFilter(params.status))
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<Listing[]>([])

  /** A new search or filter starts again from page one with an empty grid. */
  const restart = useCallback((next: { filter?: Filter; applied?: string }) => {
    if (next.filter !== undefined) setFilter(next.filter)
    if (next.applied !== undefined) setApplied(next.applied)
    setPage(1)
    setRows([])
  }, [])

  // Home stat tiles deep-link here with ?status=…
  useEffect(() => {
    if (params.status !== undefined) restart({ filter: parseFilter(params.status) })
  }, [params.status, restart])

  // Debounced search.
  useEffect(() => {
    const next = query.trim()
    if (next === applied) return
    const id = setTimeout(() => restart({ applied: next }), 300)
    return () => clearTimeout(id)
  }, [query, applied, restart])

  const load = useCallback(
    () =>
      listListings(page, PAGE_SIZE, {
        q: applied || undefined,
        status: filter === 'ALL' ? undefined : filter,
        counts: false,
      }),
    [applied, filter, page],
  )
  const pull = usePullToRefresh()
  const remote = useRemoteData(load, {
    cacheKey: `${scope === 'admin' ? cacheKeys.listingsAdmin : cacheKeys.listingsMine}:grid:${page}:${applied}:${filter}`,
  })
  const result = remote.status === 'success' ? remote.data : null

  useEffect(() => {
    if (!result) return
    setRows((current) => {
      if (result.meta.page === 1) return result.data
      return mergePageRows(current, result.data)
    })
  }, [result])

  const counts = result?.meta.statusCounts
  const total = result?.meta.total ?? 0
  const allCount = counts ? counts.ACTIVE + counts.INACTIVE : null
  const isFirstLoad = remote.isLoading && rows.length === 0
  const hasMore = rows.length < total
  const listRows = useMemo(() => toRows(rows), [rows])

  const filters: { value: Filter; label: string; count: number | null }[] = [
    { value: 'ALL', label: t('providerPortal.all'), count: allCount },
    { value: 'ACTIVE', label: t('providerHome.live'), count: counts?.ACTIVE ?? null },
    { value: 'INACTIVE', label: t('providerHome.hidden'), count: counts?.INACTIVE ?? null },
  ]

  const noneAtAll = allCount === 0
  const clearAll = () => {
    setQuery('')
    restart({ applied: '', filter: 'ALL' })
  }

  const header = (
    <View className="gap-3.5 pb-3.5">
      <View className="flex-row gap-2.5">
        <View
          className="h-12 min-w-0 flex-1 flex-row items-center gap-2.5 rounded-[14px] border border-wk-line bg-wk-sf ps-3.5"
          style={shadow}
        >
          <Search size={18} color={c.ink3} strokeWidth={1.9} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('providerPortal.searchMine')}
            placeholderTextColor={c.ink3}
            accessibilityLabel={t('providerPortal.searchMine')}
            returnKeyType="search"
            autoCorrect={false}
            onSubmitEditing={() => {
              if (query.trim() !== applied) restart({ applied: query.trim() })
            }}
            className="h-full min-w-0 flex-1 text-[15px] text-wk-ink"
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.clearSearch')}
              onPress={() => setQuery('')}
              className="size-11 items-center justify-center"
            >
              <X size={16} color={c.ink3} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('providerHome.newListing')}
          onPress={() => router.push(`${basePath}/new` as never)}
          className="size-12 items-center justify-center rounded-[14px] bg-wk-ink active:opacity-80"
        >
          <Plus size={22} color={c.bg} strokeWidth={2} />
        </Pressable>
      </View>

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
              onPress={() => {
                if (f.value !== filter) restart({ filter: f.value })
              }}
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

      {remote.status === 'error' && rows.length === 0 ? (
        <WkError
          message={errorMessage(remote.error, t('common.errorGeneric'))}
          onRetry={() => void remote.refetch()}
        />
      ) : null}
      {isFirstLoad ? <ListingGridSkeleton /> : null}
    </View>
  )

  const empty =
    !isFirstLoad && remote.status === 'success' && rows.length === 0 ? (
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
            {noneAtAll ? t('providerPortal.emptyFirstTitle') : t('providerPortal.noMatchTitle')}
          </Text>
          <Text className="text-[15px] leading-[22px] text-wk-ink2">
            {noneAtAll
              ? t('providerPortal.emptyFirstBody')
              : applied
                ? t('providerPortal.noMatchQuery', { query: applied })
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
                onPress={clearAll}
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
          title={t('listings.title')}
          backHref={backHref}
          count={total ? String(total) : undefined}
        />
      ) : null}
      <FlatList
        data={isFirstLoad ? [] : listRows}
        keyExtractor={(row) => row.map((l) => l.id).join(':')}
        renderItem={({ item: row, index }) => (
          <View className="flex-row gap-3">
            {row.map((listing, col) => (
              <ListingGridCard
                key={listing.id}
                listing={listing}
                index={index * 2 + col}
                onPress={() => router.push(`${basePath}/${listing.id}` as never)}
              />
            ))}
            {row.length === 1 ? <View className="flex-1" /> : null}
          </View>
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          hasMore && rows.length > 0 ? (
            <View className="pt-4">
              <WkButton
                variant="soft"
                height={48}
                label={t('providerPortal.loadMore')}
                loading={remote.isFetching}
                onPress={() => setPage((p) => p + 1)}
              />
            </View>
          ) : undefined
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
            refreshing={remote.isFetching && rows.length > 0 && page === 1}
            onRefresh={() => pull(() => (page === 1 ? remote.refetch() : setPage(1)))}
            tintColor={c.ink3}
            colors={[c.brand]}
          />
        }
      />
    </View>
  )
}
