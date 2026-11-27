import { useCallback, useState } from 'react'
import { RefreshControl, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Package, SearchX } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { WkGrid } from '@/components/wk/GridCard'
import { WkButton, WkError, WkTopBar } from '@/components/wk/kit'
import { PagedListFooter } from '@/components/wk/PagedListFooter'
import { useWkPalette } from '@/components/wk/palette'
import { WkSearchField } from '@/components/wk/SearchField'
import { ListingGridCard, ListingGridSkeleton } from '@/components/wk/storefront'
import { usePagedList } from '@/components/wk/usePagedList'
import { DirectoryDetailSheet, type DirectoryEntry } from '@/features/pm/DirectoryDetailSheet'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cacheKeys, cacheTtl } from '@/lib/cacheKeys'
import { type Category, getCategory } from '@/services/categories'
import { errorMessage } from '@/services/feedback'
import { type Listing, listListings } from '@/services/listings'
import { useLanguageStore } from '@/stores/languageStore'

const PAGE_SIZE = 24

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
  const { c, shadow, isDark } = useWkPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')
  const isAr = useLanguageStore((s) => s.language) === 'ar'
  const params = useLocalSearchParams<{ id?: string }>()
  const categoryId = typeof params.id === 'string' ? params.id : params.id?.[0]
  const pull = usePullToRefresh()
  const [open, setOpen] = useState<DirectoryEntry | null>(null)

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

  const list = usePagedList<Listing>({
    cacheKeyPrefix: categoryId
      ? `${cacheKeys.directory}:pm:category:${categoryId}`
      : `${cacheKeys.directory}:pm:category`,
    enabled: Boolean(categoryId),
    resetKey: categoryId,
    fetcher: ({ page, query }) => {
      if (!categoryId) throw new Error('Category id required')
      return listListings(page, PAGE_SIZE, {
        q: query || undefined,
        status: 'ACTIVE',
        categoryId,
        counts: false,
      })
    },
  })

  const renderListing = useCallback(
    (listing: Listing) => (
      <ListingGridCard
        listing={listing}
        onPress={() => setOpen({ kind: 'listing', id: listing.id, listing })}
      />
    ),
    [],
  )
  const title = categoryTitle(
    categoryRemote.status === 'success' ? categoryRemote.data : null,
    isAr,
    t('listings.title'),
  )

  const header = (
    <View className="gap-3.5 pb-3.5">
      <WkSearchField
        value={list.query}
        onChangeText={list.setQuery}
        placeholder={t('pmPortal.searchListings')}
        accessibilityLabel={t('listings.search')}
      />
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
      <View className="items-center gap-2.5 px-6 py-10">
        <View
          className="size-16 items-center justify-center rounded-[20px] bg-wk-sf"
          style={shadow}
        >
          {list.applied ? (
            <SearchX size={28} color={c.brand} strokeWidth={1.75} />
          ) : (
            <Package size={28} color={c.brand} strokeWidth={1.75} />
          )}
        </View>
        <Text className="mt-1.5 text-[17px] font-semibold text-wk-ink">
          {list.applied ? t('pmPortal.noMatches') : t('pmPortal.categoryListingsEmpty')}
        </Text>
        <Text className="max-w-[260px] text-center text-[15px] leading-[22px] text-wk-ink2">
          {list.applied ? t('pmPortal.noMatchesHint') : t('pmPortal.categoryListingsEmptyHint')}
        </Text>
        {list.applied ? (
          <View className="mt-1.5">
            <WkButton
              compact
              variant="soft"
              height={44}
              label={t('common.clearSearch')}
              onPress={list.clear}
            />
          </View>
        ) : null}
      </View>
    ) : undefined

  return (
    <View className="flex-1 bg-wk-bg" testID="e2e-pm-category-listings">
      <WkTopBar
        title={title}
        backHref={basePath}
        count={list.total ? String(list.total) : undefined}
      />
      <WkGrid
        data={list.isFirstLoad ? [] : list.rows}
        renderCard={renderListing}
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
          paddingTop: 8,
          paddingBottom: 32 + insets.bottom,
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
      <DirectoryDetailSheet entry={open} onClose={() => setOpen(null)} />
    </View>
  )
}
