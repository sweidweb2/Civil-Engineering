import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, RefreshControl, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { FolderTree, Plus, Search, SearchX, X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { CategoryGridCard } from '@/features/pm/CategoryGridCard'
import { ListingGridSkeleton } from '@/features/provider/ui/kit'
import { WkButton, WkError, WkTopBar } from '@/features/worker/ui/kit'
import { useWorkerPalette } from '@/features/worker/ui/palette'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cacheKeys, cacheTtl } from '@/lib/cacheKeys'
import {
  type Category,
  type CategoryKind,
  isListingCategory,
  listCategories,
} from '@/services/categories'
import { errorMessage } from '@/services/feedback'
import { MONO_STYLE } from '@/theme/typography'

const LISTING_KINDS: CategoryKind[] = ['MATERIAL', 'EQUIPMENT', 'SERVICE']
const BASE = '/admin/listings'

/** Two category cards per row. */
function toRows(items: Category[]): Category[][] {
  const rows: Category[][] = []
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2))
  return rows
}

/**
 * Admin → More → Listings: browse by category first, then open the
 * category's listing grid (create / edit still live under `/admin/listings`).
 */
export function AdminListingsScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { c, shadow, isDark } = useWorkerPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')

  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')

  useEffect(() => {
    const next = query.trim()
    if (next === applied) return
    const id = setTimeout(() => setApplied(next), 300)
    return () => clearTimeout(id)
  }, [query, applied])

  const load = useCallback(async () => {
    const pages = await Promise.all(
      LISTING_KINDS.map((kind) =>
        listCategories(1, 100, {
          kind,
          q: applied || undefined,
          includeCounts: true,
        }),
      ),
    )
    return pages
      .flatMap((r) => r.data)
      .filter((cat) => isListingCategory(cat) && cat.isActive && (cat.listingCount ?? 0) > 0)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  }, [applied])

  const pull = usePullToRefresh()
  const remote = useRemoteData(load, {
    cacheKey: `${cacheKeys.listingsAdmin}:categories:${applied}`,
    staleTime: cacheTtl.reference,
  })

  const categories = remote.status === 'success' ? remote.data : []
  const rows = useMemo(() => toRows(categories), [categories])
  const isFirstLoad = remote.isLoading

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
            placeholder={t('pmPortal.searchCategories')}
            placeholderTextColor={c.ink3}
            accessibilityLabel={t('categories.search')}
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('providerHome.newListing')}
          onPress={() => router.push(`${BASE}/new` as never)}
          className="size-12 items-center justify-center rounded-[14px] bg-wk-ink active:opacity-80"
        >
          <Plus size={22} color={c.bg} strokeWidth={2} />
        </Pressable>
      </View>

      {remote.status === 'success' ? (
        <Text className="text-[11px] font-medium uppercase text-wk-ink3" style={MONO_STYLE}>
          {t('pmPortal.results', { count: categories.length })}
        </Text>
      ) : null}

      {remote.status === 'error' ? (
        <WkError
          message={errorMessage(remote.error, t('common.errorGeneric'))}
          onRetry={() => void remote.refetch()}
        />
      ) : null}
      {isFirstLoad ? <ListingGridSkeleton /> : null}
    </View>
  )

  const empty =
    !isFirstLoad && remote.status === 'success' && categories.length === 0 ? (
      <View className="items-center gap-2.5 px-6 py-10">
        <View
          className="size-16 items-center justify-center rounded-[20px] bg-wk-sf"
          style={shadow}
        >
          {applied ? (
            <SearchX size={28} color={c.brand} strokeWidth={1.75} />
          ) : (
            <FolderTree size={28} color={c.brand} strokeWidth={1.75} />
          )}
        </View>
        <Text className="mt-1.5 text-[17px] font-semibold text-wk-ink">
          {applied ? t('pmPortal.noMatches') : t('pmPortal.categoriesEmpty')}
        </Text>
        <Text className="max-w-[260px] text-center text-[15px] leading-[22px] text-wk-ink2">
          {applied ? t('pmPortal.noMatchesHint') : t('pmPortal.categoriesEmptyHint')}
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
        ) : (
          <View className="mt-1.5">
            <WkButton
              compact
              height={44}
              icon={Plus}
              label={t('providerHome.newListing')}
              onPress={() => router.push(`${BASE}/new` as never)}
            />
          </View>
        )}
      </View>
    ) : undefined

  return (
    <View className="flex-1 bg-wk-bg" testID="e2e-admin-listings">
      <WkTopBar title={t('listings.title')} backHref="/admin/more" />
      <FlatList
        data={isFirstLoad ? [] : rows}
        keyExtractor={(row) => row.map((cat) => cat.id).join(':')}
        renderItem={({ item: row, index }) => (
          <View className="flex-row gap-3">
            {row.map((category, col) => (
              <CategoryGridCard
                key={category.id}
                category={category}
                index={index * 2 + col}
                onPress={() => router.push(`${BASE}/categories/${category.id}` as never)}
              />
            ))}
            {row.length === 1 ? <View className="flex-1" /> : null}
          </View>
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerClassName="px-5"
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: 32 + insets.bottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={remote.isFetching && !isFirstLoad}
            onRefresh={() => pull(() => remote.refetch())}
            tintColor={c.ink3}
            colors={[c.brand]}
          />
        }
      />
    </View>
  )
}
