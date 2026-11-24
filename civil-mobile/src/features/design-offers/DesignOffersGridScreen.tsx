import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { LayoutGrid, Plus, Search, X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { Pressable } from '@/components/ui/pressable'
import { DesignOfferGridCard } from '@/features/design-offers/DesignOfferGridCard'
import { WkButton, WkError, WkSkeletonCard, WkTopBar } from '@/features/worker/ui/kit'
import { useWorkerPalette } from '@/features/worker/ui/palette'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cacheKeys } from '@/lib/cacheKeys'
import { type DesignOffer, listDesignOffers } from '@/services/design-offers'
import { errorMessage } from '@/services/feedback'

const PAGE_SIZE = 20

function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2))
  return rows
}

function mergePageRows(current: DesignOffer[], next: DesignOffer[]) {
  const seen = new Set(current.map((row) => row.id))
  return [...current, ...next.filter((row) => !seen.has(row.id))]
}

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
  const { c, shadow } = useWorkerPalette()
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [rows, setRows] = useState<DesignOffer[]>([])

  const restart = useCallback((nextApplied: string) => {
    setApplied(nextApplied)
    setPage(1)
    setRows([])
  }, [])

  useEffect(() => {
    const next = query.trim()
    if (next === applied) return
    const id = setTimeout(() => restart(next), 300)
    return () => clearTimeout(id)
  }, [query, applied, restart])

  const load = useCallback(
    () =>
      listDesignOffers({
        page,
        limit: PAGE_SIZE,
        q: applied || undefined,
        activeOnly: mode === 'admin' ? undefined : true,
      }),
    [page, applied, mode],
  )

  const remote = useRemoteData(load, {
    cacheKey: `${cacheKeys.designOffers}:${mode}:${page}:${applied}`,
  })
  const result = remote.status === 'success' ? remote.data : null

  useEffect(() => {
    if (!result) return
    setRows((current) => {
      if (result.meta.page === 1) return result.data
      return mergePageRows(current, result.data)
    })
  }, [result])

  const total = result?.meta.total ?? rows.length
  const hasMore = rows.length < total
  const isFirstLoad = remote.isLoading && rows.length === 0
  const listRows = useMemo(() => chunkPairs(rows), [rows])
  const screenTitle = title ?? t('designOffers.title')

  const onPressOffer = (offer: DesignOffer) => {
    if (onSelectOffer) {
      onSelectOffer(offer)
      return
    }
    if (mode === 'admin') {
      router.push(`/admin/design-offers/${offer.id}` as never)
      return
    }
    router.push(`/pm/design-requests/new?designOfferId=${offer.id}` as never)
  }

  const header = (
    <View className="gap-3 pb-3">
      <View className="flex-row gap-2.5">
        <View
          className="h-12 min-w-0 flex-1 flex-row items-center gap-2.5 rounded-[14px] border border-wk-line bg-wk-sf ps-3.5"
          style={shadow}
        >
          <Search size={18} color={c.ink3} strokeWidth={1.9} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('designOffers.search')}
            placeholderTextColor={c.ink3}
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
        {mode === 'admin' && !embedded ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('designOffers.add')}
            onPress={() => router.push('/admin/design-offers/new' as never)}
            className="size-12 items-center justify-center rounded-[14px] bg-wk-ink active:opacity-80"
          >
            <Plus size={22} color={c.bg} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
      {remote.status === 'error' && rows.length === 0 ? (
        <WkError
          message={errorMessage(remote.error, t('common.errorGeneric'))}
          onRetry={() => void remote.refetch()}
        />
      ) : null}
      {isFirstLoad ? (
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
    !isFirstLoad && remote.status === 'success' && rows.length === 0 ? (
      <View className="items-center gap-2.5 px-6 py-10">
        <View
          className="size-16 items-center justify-center rounded-[20px] bg-wk-sf"
          style={shadow}
        >
          <LayoutGrid size={28} color={c.brand} strokeWidth={1.75} />
        </View>
        <Text className="mt-1.5 text-[17px] font-semibold text-wk-ink">
          {applied ? t('designOffers.emptySearch') : t('designOffers.empty')}
        </Text>
        <Text className="max-w-[260px] text-center text-[15px] leading-[22px] text-wk-ink2">
          {applied ? t('designOffers.emptySearchHint') : t('designOffers.emptyHint')}
        </Text>
      </View>
    ) : undefined

  const list = (
    <FlatList
      data={isFirstLoad ? [] : listRows}
      keyExtractor={(row) => row.map((o) => o.id).join(':')}
      renderItem={({ item: row, index }) => (
        <View className="flex-row gap-3">
          {row.map((offer, col) => (
            <DesignOfferGridCard
              key={offer.id}
              offer={offer}
              index={index * 2 + col}
              showInactiveBadge={mode === 'admin'}
              onPress={() => onPressOffer(offer)}
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
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    />
  )

  if (embedded) return <View className="flex-1 bg-wk-bg">{list}</View>

  return (
    <View className="flex-1 bg-wk-bg">
      <WkTopBar title={screenTitle} backHref={backHref} count={total ? String(total) : undefined} />
      {list}
    </View>
  )
}
