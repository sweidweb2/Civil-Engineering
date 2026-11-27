import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, RefreshControl, Text, View } from 'react-native'
import { router } from 'expo-router'
import { FolderTree, HardHat, SearchX } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { WkGridRow, WkGridSpacer } from '@/components/wk/GridCard'
import { WkButton, WkError, WkTopBar } from '@/components/wk/kit'
import { useWkPalette, WK_TAB_SPACE } from '@/components/wk/palette'
import { WkSearchField } from '@/components/wk/SearchField'
import { WkSegmented } from '@/components/wk/settings'
import { ListingGridSkeleton } from '@/components/wk/storefront'
import { CategoryGridCard } from '@/features/pm/CategoryGridCard'
import { SpecialtyGridCard } from '@/features/pm/SpecialtyGridCard'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cacheKeys, cacheTtl } from '@/lib/cacheKeys'
import { LIST_PERF } from '@/lib/listPerf'
import { toPairs } from '@/lib/pagedRows'
import { specialtyLabel, WORKER_SPECIALTIES, type WorkerSpecialty } from '@/lib/specialties'
import { listActiveListingCategories } from '@/services/categories'
import { errorMessage } from '@/services/feedback'
import { listWorkers } from '@/services/workers'
import { MONO_STYLE } from '@/theme/typography'

type Kind = 'listings' | 'workers'

type SpecialtyCard = WorkerSpecialty & { count: number }

/**
 * PM "Directory" tab: marketplace categories → listings, plus specialty → workers.
 * Admin reuses it from More with `backHref` / `basePath`.
 */
export function PmDirectoryScreen({
  backHref,
  basePath = '/pm/directory',
}: {
  backHref?: string
  basePath?: string
} = {}) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const { c, shadow, isDark } = useWkPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')

  const [kind, setKind] = useState<Kind>('listings')
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')

  const restart = useCallback((next: { kind?: Kind; applied?: string }) => {
    if (next.kind !== undefined) setKind(next.kind)
    if (next.applied !== undefined) setApplied(next.applied)
  }, [])

  useEffect(() => {
    const next = query.trim()
    if (next === applied) return
    const id = setTimeout(() => restart({ applied: next }), 300)
    return () => clearTimeout(id)
  }, [query, applied, restart])

  const loadCategories = useCallback(
    () => listActiveListingCategories(applied || undefined),
    [applied],
  )

  /** Facet counts for specialty cards (limit 1 — we only need meta.specialtyCounts). */
  const loadSpecialtyFacets = useCallback(async () => {
    const r = await listWorkers({ page: 1, limit: 1, q: applied || undefined, counts: true })
    return r.meta.specialtyCounts ?? {}
  }, [applied])

  const pull = usePullToRefresh()
  const categoriesRemote = useRemoteData(loadCategories, {
    enabled: kind === 'listings',
    cacheKey: `${cacheKeys.directory}:pm:categories:${applied}`,
    staleTime: cacheTtl.reference,
  })
  const specialtiesRemote = useRemoteData(loadSpecialtyFacets, {
    enabled: kind === 'workers',
    cacheKey: `${cacheKeys.directory}:pm:specialty-counts:${applied}`,
    staleTime: cacheTtl.reference,
  })

  const categories = categoriesRemote.status === 'success' ? categoriesRemote.data : []
  const categoryRows = useMemo(() => toPairs(categories), [categories])

  const specialtyCounts =
    specialtiesRemote.status === 'success' ? specialtiesRemote.data : ({} as Record<string, number>)

  const specialties = useMemo(() => {
    const q = applied.trim().toLowerCase()
    const cards: SpecialtyCard[] = WORKER_SPECIALTIES.map((item) => ({
      ...item,
      count: specialtyCounts[item.id] ?? 0,
    })).filter((item) => item.count > 0)

    if (!q) return cards
    return cards.filter((item) => {
      const label = specialtyLabel(item.id, i18n.language).toLowerCase()
      return (
        label.includes(q) ||
        item.en.toLowerCase().includes(q) ||
        item.ar.includes(applied.trim()) ||
        item.id.includes(q)
      )
    })
  }, [applied, i18n.language, specialtyCounts])

  const specialtyRows = useMemo(() => toPairs(specialties), [specialties])
  const isCategoriesLoading = kind === 'listings' && categoriesRemote.isLoading
  const isSpecialtiesLoading = kind === 'workers' && specialtiesRemote.isLoading

  const header = (
    <View className="gap-3.5 pb-3.5">
      <WkSearchField
        value={query}
        onChangeText={setQuery}
        placeholder={
          kind === 'listings' ? t('pmPortal.searchCategories') : t('pmPortal.searchSpecialties')
        }
        accessibilityLabel={t('directory.title')}
      />
      <View className="flex-row items-center gap-3">
        <View className="min-w-0 flex-1">
          <WkSegmented<Kind>
            options={[
              { value: 'listings', label: t('listings.title') },
              { value: 'workers', label: t('pmPortal.workers') },
            ]}
            value={kind}
            onChange={(next) => {
              if (next !== kind) restart({ kind: next })
            }}
          />
        </View>
        {kind === 'listings' && categoriesRemote.status === 'success' ? (
          <Text className="text-[11px] font-medium uppercase text-wk-ink3" style={MONO_STYLE}>
            {t('pmPortal.results', { count: categories.length })}
          </Text>
        ) : null}
        {kind === 'workers' && specialtiesRemote.status === 'success' ? (
          <Text className="text-[11px] font-medium uppercase text-wk-ink3" style={MONO_STYLE}>
            {t('pmPortal.results', { count: specialties.length })}
          </Text>
        ) : null}
      </View>
      {kind === 'listings' && categoriesRemote.status === 'error' ? (
        <WkError
          message={errorMessage(categoriesRemote.error, t('common.errorGeneric'))}
          onRetry={() => void categoriesRemote.refetch()}
        />
      ) : null}
      {kind === 'workers' && specialtiesRemote.status === 'error' ? (
        <WkError
          message={errorMessage(specialtiesRemote.error, t('common.errorGeneric'))}
          onRetry={() => void specialtiesRemote.refetch()}
        />
      ) : null}
      {isCategoriesLoading || isSpecialtiesLoading ? <ListingGridSkeleton /> : null}
    </View>
  )

  const categoriesEmpty =
    kind === 'listings' &&
    !isCategoriesLoading &&
    categoriesRemote.status === 'success' &&
    categories.length === 0 ? (
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
        ) : null}
      </View>
    ) : undefined

  const specialtiesEmpty =
    kind === 'workers' &&
    !isSpecialtiesLoading &&
    specialtiesRemote.status === 'success' &&
    specialties.length === 0 ? (
      <View className="items-center gap-2.5 px-6 py-10">
        <View
          className="size-16 items-center justify-center rounded-[20px] bg-wk-sf"
          style={shadow}
        >
          {applied ? (
            <SearchX size={28} color={c.brand} strokeWidth={1.75} />
          ) : (
            <HardHat size={28} color={c.brand} strokeWidth={1.75} />
          )}
        </View>
        <Text className="mt-1.5 text-[17px] font-semibold text-wk-ink">
          {applied ? t('pmPortal.noMatches') : t('pmPortal.specialtiesEmpty')}
        </Text>
        <Text className="max-w-[260px] text-center text-[15px] leading-[22px] text-wk-ink2">
          {applied ? t('pmPortal.noMatchesHint') : t('pmPortal.specialtiesEmptyHint')}
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

  if (kind === 'listings') {
    return (
      <View className="flex-1 bg-wk-bg" testID="e2e-pm-directory">
        {backHref ? <WkTopBar title={t('directory.title')} backHref={backHref} /> : null}
        <FlatList
          data={isCategoriesLoading ? [] : categoryRows}
          keyExtractor={(row) => row.map((cat) => cat.id).join(':')}
          {...LIST_PERF}
          renderItem={({ item: row }) => (
            <WkGridRow>
              {row.map((category) => (
                <CategoryGridCard
                  key={category.id}
                  category={category}
                  onPress={() => router.push(`${basePath}/categories/${category.id}` as never)}
                />
              ))}
              {row.length === 1 ? <WkGridSpacer /> : null}
            </WkGridRow>
          )}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListHeaderComponent={header}
          ListEmptyComponent={categoriesEmpty}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerClassName="px-5"
          contentContainerStyle={{
            paddingTop: backHref ? 8 : insets.top + 12,
            paddingBottom: WK_TAB_SPACE + insets.bottom,
          }}
          refreshControl={
            <RefreshControl
              refreshing={categoriesRemote.isFetching && !isCategoriesLoading}
              onRefresh={() => pull(() => categoriesRemote.refetch())}
              tintColor={c.ink3}
              colors={[c.brand]}
            />
          }
        />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-wk-bg" testID="e2e-pm-directory">
      {backHref ? <WkTopBar title={t('directory.title')} backHref={backHref} /> : null}
      <FlatList
        data={isSpecialtiesLoading ? [] : specialtyRows}
        keyExtractor={(row) => row.map((item) => item.id).join(':')}
        {...LIST_PERF}
        renderItem={({ item: row }) => (
          <WkGridRow>
            {row.map((specialty) => (
              <SpecialtyGridCard
                key={specialty.id}
                label={specialtyLabel(specialty.id, i18n.language)}
                count={specialty.count}
                onPress={() => router.push(`${basePath}/specialties/${specialty.id}` as never)}
              />
            ))}
            {row.length === 1 ? <WkGridSpacer /> : null}
          </WkGridRow>
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={header}
        ListEmptyComponent={specialtiesEmpty}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerClassName="px-5"
        contentContainerStyle={{
          paddingTop: backHref ? 8 : insets.top + 12,
          paddingBottom: WK_TAB_SPACE + insets.bottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={specialtiesRemote.isFetching && !isSpecialtiesLoading}
            onRefresh={() => pull(() => specialtiesRemote.refetch())}
            tintColor={c.ink3}
            colors={[c.brand]}
          />
        }
      />
    </View>
  )
}
