import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, Text, View } from 'react-native'
import { router } from 'expo-router'
import { FolderTree, Plus, SearchX } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { WkGrid } from '@/components/wk/GridCard'
import { WkButton, WkError, WkTopBar } from '@/components/wk/kit'
import { useWkPalette } from '@/components/wk/palette'
import { WkSearchAddButton, WkSearchField } from '@/components/wk/SearchField'
import { ListingGridSkeleton } from '@/components/wk/storefront'
import { CategoryGridCard } from '@/features/pm/CategoryGridCard'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cacheKeys, cacheTtl } from '@/lib/cacheKeys'
import { listActiveListingCategories } from '@/services/categories'
import { errorMessage } from '@/services/feedback'
import { MONO_STYLE } from '@/theme/typography'

const BASE = '/admin/listings'

/**
 * Admin → More → Listings: browse by category first, then open the
 * category's listing grid (create / edit still live under `/admin/listings`).
 */
export function AdminListingsScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { c, shadow, isDark } = useWkPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')

  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')

  useEffect(() => {
    const next = query.trim()
    if (next === applied) return
    const id = setTimeout(() => setApplied(next), 300)
    return () => clearTimeout(id)
  }, [query, applied])

  const load = useCallback(() => listActiveListingCategories(applied || undefined), [applied])

  const pull = usePullToRefresh()
  const remote = useRemoteData(load, {
    cacheKey: `${cacheKeys.listingsAdmin}:categories:${applied}`,
    staleTime: cacheTtl.reference,
  })

  const categories = remote.status === 'success' ? remote.data : []
  const renderCategory = useCallback(
    (category: (typeof categories)[number]) => (
      <CategoryGridCard
        category={category}
        onPress={() => router.push(`${BASE}/categories/${category.id}` as never)}
      />
    ),
    [],
  )
  const isFirstLoad = remote.isLoading

  const header = (
    <View className="gap-3.5 pb-3.5">
      <WkSearchField
        value={query}
        onChangeText={setQuery}
        placeholder={t('pmPortal.searchCategories')}
        accessibilityLabel={t('categories.search')}
        trailing={
          <WkSearchAddButton
            label={t('providerHome.newListing')}
            onPress={() => router.push(`${BASE}/new` as never)}
          />
        }
      />

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
      <WkGrid
        data={isFirstLoad ? [] : categories}
        renderCard={renderCategory}
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
