import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, RefreshControl, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Package, Search, SearchX, X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { DirectoryDetailSheet, type DirectoryEntry } from '@/features/pm/DirectoryDetailSheet'
import { ListingGridCard, ListingGridSkeleton } from '@/features/provider/ui/kit'
import { WkButton, WkError, WkTopBar } from '@/features/worker/ui/kit'
import { useWorkerPalette } from '@/features/worker/ui/palette'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cacheKeys, cacheTtl } from '@/lib/cacheKeys'
import { mergePageRows } from '@/lib/pagedRows'
import { type Category, getCategory } from '@/services/categories'
import { errorMessage } from '@/services/feedback'
import { type Listing, listListings } from '@/services/listings'
import { useLanguageStore } from '@/stores/languageStore'

const PAGE_SIZE = 24

/** Two cards per row; an odd last card keeps half width. */
function toRows(items: Listing[]): Listing[][] {
  const rows: Listing[][] = []
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2))
  return rows
}

function categoryTitle(category: Category | null, isAr: boolean, fallback: string) {
  if (!category) return fallback
  return (isAr && category.nameAr) || category.name || fallback
}

/**
 * Listings under one marketplace category (grid). Opened from the PM/admin
 * directory category cards.
 */
export function PmCategoryListingsScreen({
  basePath = '/pm/directory',
}: {
  basePath?: string
} = {}) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { c, shadow, isDark } = useWorkerPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')
  const isAr = useLanguageStore((s) => s.language) === 'ar'
  const params = useLocalSearchParams<{ id?: string }>()
  const categoryId = typeof params.id === 'string' ? params.id : params.id?.[0]

  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<Listing[]>([])
  const [open, setOpen] = useState<DirectoryEntry | null>(null)

  const restart = useCallback((next?: { applied?: string }) => {
    if (next?.applied !== undefined) setApplied(next.applied)
    setPage(1)
    setRows([])
  }, [])

  useEffect(() => {
    const next = query.trim()
    if (next === applied) return
    const id = setTimeout(() => restart({ applied: next }), 300)
    return () => clearTimeout(id)
  }, [query, applied, restart])

  const loadCategory = useCallback(async () => {
    if (!categoryId) throw new Error('Category id required')
    const r = await getCategory(categoryId)
    return r.data
  }, [categoryId])

  const categoryRemote = useRemoteData(loadCategory, {
    enabled: Boolean(categoryId),
    cacheKey: categoryId ? `${cacheKeys.categories}:${categoryId}` : undefined,
    staleTime: cacheTtl.reference,
  })

  const loadListings = useCallback(async () => {
    if (!categoryId) throw new Error('Category id required')
    return listListings(page, PAGE_SIZE, {
      q: applied || undefined,
      status: 'ACTIVE',
      categoryId,
      counts: false,
    })
  }, [applied, categoryId, page])

  const pull = usePullToRefresh()
  const listingsRemote = useRemoteData(loadListings, {
    enabled: Boolean(categoryId),
    cacheKey: categoryId
      ? `${cacheKeys.directory}:pm:category:${categoryId}:${page}:${applied}`
      : undefined,
  })
  const result = listingsRemote.status === 'success' ? listingsRemote.data : null

  useEffect(() => {
    if (!result) return
    setRows((current) => {
      if (result.meta.page === 1) return result.data
      return mergePageRows(current, result.data)
    })
  }, [result])

  const total = result?.meta.total ?? 0
  const isFirstLoad = listingsRemote.isLoading && rows.length === 0
  const hasMore = rows.length < total
  const listRows = useMemo(() => toRows(rows), [rows])
  const title = categoryTitle(
    categoryRemote.status === 'success' ? categoryRemote.data : null,
    isAr,
    t('listings.title'),
  )

  const header = (
    <View className="gap-3.5 pb-3.5">
      <View
        className="h-12 flex-row items-center gap-2.5 rounded-[14px] border border-wk-line bg-wk-sf ps-3.5"
        style={shadow}
      >
        <Search size={18} color={c.ink3} strokeWidth={1.9} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('pmPortal.searchListings')}
          placeholderTextColor={c.ink3}
          accessibilityLabel={t('listings.search')}
          returnKeyType="search"
          autoCorrect={false}
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
      {listingsRemote.status === 'error' && rows.length === 0 ? (
        <WkError
          message={errorMessage(listingsRemote.error, t('common.errorGeneric'))}
          onRetry={() => void listingsRemote.refetch()}
        />
      ) : null}
      {isFirstLoad ? <ListingGridSkeleton /> : null}
    </View>
  )

  const empty =
    !isFirstLoad && listingsRemote.status === 'success' && rows.length === 0 ? (
      <View className="items-center gap-2.5 px-6 py-10">
        <View
          className="size-16 items-center justify-center rounded-[20px] bg-wk-sf"
          style={shadow}
        >
          {applied ? (
            <SearchX size={28} color={c.brand} strokeWidth={1.75} />
          ) : (
            <Package size={28} color={c.brand} strokeWidth={1.75} />
          )}
        </View>
        <Text className="mt-1.5 text-[17px] font-semibold text-wk-ink">
          {applied ? t('pmPortal.noMatches') : t('pmPortal.categoryListingsEmpty')}
        </Text>
        <Text className="max-w-[260px] text-center text-[15px] leading-[22px] text-wk-ink2">
          {applied ? t('pmPortal.noMatchesHint') : t('pmPortal.categoryListingsEmptyHint')}
        </Text>
        {applied ? (
          <View className="mt-1.5">
            <WkButton
              compact
              variant="soft"
              height={44}
              label={t('common.clearSearch')}
              onPress={() => setQuery('')}
            />
          </View>
        ) : null}
      </View>
    ) : undefined

  return (
    <View className="flex-1 bg-wk-bg" testID="e2e-pm-category-listings">
      <WkTopBar title={title} backHref={basePath} count={total ? String(total) : undefined} />
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
                onPress={() => setOpen({ kind: 'listing', id: listing.id, listing })}
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
                loading={listingsRemote.isFetching}
                onPress={() => setPage((p) => p + 1)}
              />
            </View>
          ) : undefined
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerClassName="px-5"
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: 32 + insets.bottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={listingsRemote.isFetching && rows.length > 0 && page === 1}
            onRefresh={() => pull(() => (page === 1 ? listingsRemote.refetch() : restart()))}
            tintColor={c.ink3}
            colors={[c.brand]}
          />
        }
      />
      <DirectoryDetailSheet entry={open} onClose={() => setOpen(null)} />
    </View>
  )
}
