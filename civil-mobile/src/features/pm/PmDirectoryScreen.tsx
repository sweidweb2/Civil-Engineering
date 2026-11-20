import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, Text, TextInput, View } from 'react-native'
import { Image } from 'expo-image'
import {
  BadgeCheck,
  Banknote,
  Briefcase,
  HardHat,
  LayoutGrid,
  type LucideIcon,
  MapPin,
  Package,
  Search,
  SearchX,
  Store,
  Tag,
  X,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BottomSheet, useStatusBarStyle } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { cardPrice, useCategoryName } from '@/features/provider/ui/kit'
import { WkButton, WkError, WkSkeletonCard, WkTopBar } from '@/features/worker/ui/kit'
import { useWorkerPalette, WK_TAB_SPACE } from '@/features/worker/ui/palette'
import { WkSegmented } from '@/features/worker/ui/settings'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import { REMOTE_IMAGE_CACHE_POLICY, remoteImage } from '@/lib/imageSource'
import { mergePageRows } from '@/lib/pagedRows'
import { ltr } from '@/lib/rtl'
import { initialsOf } from '@/lib/user'
import { errorMessage } from '@/services/feedback'
import { type Listing, listListings } from '@/services/listings'
import { directoryWorkerName, listWorkers, type WorkerDirectoryItem } from '@/services/workers'
import { MONO_STYLE } from '@/theme/typography'

const PAGE_SIZE = 20
type Kind = 'listings' | 'workers'

type Entry =
  | { kind: 'listing'; id: string; listing: Listing }
  | { kind: 'worker'; id: string; worker: WorkerDirectoryItem }

type Fact = { icon: LucideIcon; label: string; value: string; ltr?: boolean }

/** PM "Directory" tab: marketplace listings and public workers, with a detail sheet. */
export function PmDirectoryScreen({ backHref }: { backHref?: string } = {}) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { c, shadow, isDark } = useWorkerPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')
  const categoryName = useCategoryName()

  const [kind, setKind] = useState<Kind>('listings')
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<Entry[]>([])
  const [open, setOpen] = useState<Entry | null>(null)

  const restart = useCallback((next: { kind?: Kind; applied?: string }) => {
    if (next.kind !== undefined) setKind(next.kind)
    if (next.applied !== undefined) setApplied(next.applied)
    setPage(1)
    setRows([])
  }, [])

  useEffect(() => {
    const next = query.trim()
    if (next === applied) return
    const id = setTimeout(() => restart({ applied: next }), 300)
    return () => clearTimeout(id)
  }, [query, applied, restart])

  const load = useCallback(async (): Promise<{ rows: Entry[]; total: number; page: number }> => {
    if (kind === 'listings') {
      const r = await listListings(page, PAGE_SIZE, {
        q: applied || undefined,
        status: 'ACTIVE',
        counts: false,
      })
      return {
        rows: r.data.map((listing) => ({ kind: 'listing', id: listing.id, listing })),
        total: r.meta.total,
        page: r.meta.page,
      }
    }
    const r = await listWorkers({ page, limit: PAGE_SIZE, q: applied || undefined })
    return {
      rows: r.data.map((worker) => ({ kind: 'worker', id: worker.id, worker })),
      total: r.meta.total,
      page: r.meta.page,
    }
  }, [applied, kind, page])
  const pull = usePullToRefresh()
  const remote = useRemoteData(load, {
    cacheKey: `${cacheKeys.directory}:pm:${kind}:${page}:${applied}`,
  })
  const result = remote.status === 'success' ? remote.data : null

  useEffect(() => {
    if (!result) return
    setRows((current) => {
      if (result.page === 1) return result.rows
      return mergePageRows(current, result.rows)
    })
  }, [result])

  const total = result?.total ?? 0
  const isFirstLoad = remote.isLoading && rows.length === 0
  const hasMore = rows.length < total

  function row(entry: Entry) {
    const isListing = entry.kind === 'listing'
    const name = isListing ? entry.listing.name : directoryWorkerName(entry.worker)
    const sub = isListing
      ? [entry.listing.providerName, categoryName(entry.listing)].filter(Boolean).join(' · ')
      : [entry.worker.headline || entry.worker.primaryTrade, entry.worker.city]
          .filter(Boolean)
          .join(' · ')
    // Worker `avatarUrl` is a private File id, not a URL: show initials (like civil-web).
    const photo = isListing ? entry.listing.mainImageUrl : null
    const photoKey = isListing ? entry.listing.mainImageKey : null
    const verified = !isListing && entry.worker.isVerified
    const typeLabel = isListing
      ? entry.listing.type
        ? enumLabel(t, 'listingType', entry.listing.type)
        : t('listings.listing')
      : t('pmPortal.worker')
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={name}
        onPress={() => setOpen(entry)}
        className="min-h-[76px] flex-row items-center gap-3.5 bg-wk-sf px-3.5 py-3 active:bg-wk-sf2"
      >
        <View
          className={`size-[52px] items-center justify-center overflow-hidden ${
            isListing ? 'rounded-2xl bg-wk-sf2' : 'rounded-full bg-wk-hero'
          }`}
        >
          {photo ? (
            <Image
              source={remoteImage(photo, photoKey)}
              cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
              style={{ position: 'absolute', inset: 0 }}
              contentFit="cover"
              recyclingKey={photoKey ?? photo}
            />
          ) : isListing ? (
            <Package size={20} color={c.ink3} strokeWidth={1.7} />
          ) : (
            <Text className="text-[17px] font-semibold text-wk-lime">{initialsOf(name)}</Text>
          )}
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row items-center gap-1.5">
            <Text
              className="min-w-0 shrink text-[15px] font-semibold text-wk-ink"
              numberOfLines={1}
            >
              {name}
            </Text>
            {verified ? <BadgeCheck size={15} color={c.brand} strokeWidth={2} /> : null}
          </View>
          <Text className="text-[13px] text-wk-ink2" numberOfLines={1}>
            {sub || '—'}
          </Text>
        </View>
        <View
          className={`h-[22px] justify-center rounded-full px-2 ${
            isListing ? 'bg-wk-teal-soft' : 'bg-wk-sf2'
          }`}
        >
          <Text
            className={`text-[11px] font-medium ${isListing ? 'text-wk-teal' : 'text-wk-ink2'}`}
          >
            {typeLabel}
          </Text>
        </View>
      </Pressable>
    )
  }

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
          placeholder={
            kind === 'listings' ? t('pmPortal.searchListings') : t('pmPortal.searchWorkers')
          }
          placeholderTextColor={c.ink3}
          accessibilityLabel={t('directory.title')}
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
        {result ? (
          <Text className="text-[11px] font-medium uppercase text-wk-ink3" style={MONO_STYLE}>
            {t('pmPortal.results', { count: total })}
          </Text>
        ) : null}
      </View>
      {remote.status === 'error' && rows.length === 0 ? (
        <WkError
          message={errorMessage(remote.error, t('common.errorGeneric'))}
          onRetry={() => void remote.refetch()}
        />
      ) : null}
      {isFirstLoad ? (
        <View className="gap-3">
          <WkSkeletonCard />
          <WkSkeletonCard />
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
          <SearchX size={28} color={c.brand} strokeWidth={1.75} />
        </View>
        <Text className="mt-1.5 text-[17px] font-semibold text-wk-ink">
          {applied ? t('pmPortal.noMatches') : t('pmPortal.directoryEmpty')}
        </Text>
        <Text className="max-w-[260px] text-center text-[15px] leading-[22px] text-wk-ink2">
          {applied
            ? t('pmPortal.noMatchesHint')
            : kind === 'workers'
              ? t('pmPortal.noWorkersHint')
              : t('directory.empty')}
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
    ) : null

  return (
    <View className="flex-1 bg-wk-bg" testID="e2e-pm-directory">
      {backHref ? <WkTopBar title={t('directory.title')} backHref={backHref} /> : null}
      <FlatList
        data={isFirstLoad ? [] : rows}
        keyExtractor={(e) => `${e.kind}:${e.id}`}
        renderItem={({ item, index }) => (
          <View
            className={`overflow-hidden ${index === 0 ? 'rounded-t-[22px]' : ''} ${
              index === rows.length - 1 ? 'rounded-b-[22px]' : 'border-b border-wk-line'
            }`}
          >
            {row(item)}
          </View>
        )}
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
          ) : null
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
            onRefresh={() => pull(() => (page === 1 ? remote.refetch() : restart({})))}
            tintColor={c.ink3}
            colors={[c.brand]}
          />
        }
      />

      <DirectorySheet entry={open} onClose={() => setOpen(null)} />
    </View>
  )
}

function DirectorySheet({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  const { t } = useTranslation()
  const { c } = useWorkerPalette()
  const categoryName = useCategoryName()
  // Keep the last entry while the sheet animates closed.
  const [shown, setShown] = useState<Entry | null>(entry)
  useEffect(() => {
    if (entry) setShown(entry)
  }, [entry])

  if (!shown) return null
  const isListing = shown.kind === 'listing'
  const name = isListing ? shown.listing.name : directoryWorkerName(shown.worker)
  // Worker `avatarUrl` is a private File id, not a URL: show initials (like civil-web).
  const photo = isListing ? shown.listing.mainImageUrl : null
  const photoKey = isListing ? shown.listing.mainImageKey : null
  const verified = !isListing && shown.worker.isVerified

  let sub = ''
  let facts: Fact[] = []
  if (shown.kind === 'listing') {
    const l = shown.listing
    sub = [l.providerName, l.type ? enumLabel(t, 'listingType', l.type) : null]
      .filter(Boolean)
      .join(' · ')
    facts = [
      { icon: Banknote, label: t('listings.price'), value: cardPrice(t, l) },
      { icon: LayoutGrid, label: t('listings.category'), value: categoryName(l) || '—' },
      { icon: Tag, label: t('listings.brand'), value: l.brand?.trim() || '—' },
      {
        icon: Package,
        label: t('listings.quantity'),
        value: l.quantityAvailable
          ? ltr([l.quantityAvailable, l.unit].filter(Boolean).join(' '))
          : '—',
      },
      { icon: Store, label: t('listings.provider'), value: l.providerName || '—' },
    ]
  } else {
    const w = shown.worker
    const cur = w.currency?.trim() || ''
    const rate = w.hourlyRate
      ? t('worker.rateHour', { amount: w.hourlyRate, currency: cur })
      : w.dailyRate
        ? t('worker.rateDay', { amount: w.dailyRate, currency: cur })
        : '—'
    sub = [w.headline, w.primaryTrade].filter(Boolean).join(' · ')
    facts = [
      { icon: HardHat, label: t('worker.trade'), value: w.primaryTrade || '—' },
      {
        icon: Briefcase,
        label: t('worker.yearsExperience'),
        value: w.yearsExperience != null ? String(w.yearsExperience) : '—',
      },
      { icon: Banknote, label: t('worker.pay'), value: rate },
      { icon: MapPin, label: t('common.city'), value: w.city || '—' },
    ]
  }

  return (
    <BottomSheet visible={Boolean(entry)} onClose={onClose} maxHeightRatio={0.85}>
      <View className="gap-3.5 pb-3">
        <View className="-mx-5 h-[150px] overflow-hidden bg-wk-hero">
          {isListing && photo ? (
            <Image
              source={remoteImage(photo, photoKey)}
              cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          ) : null}
        </View>
        <View
          className={`-mt-12 size-[68px] items-center justify-center overflow-hidden border-4 border-wk-sf ${
            isListing ? 'rounded-2xl bg-wk-sf2' : 'rounded-full bg-wk-hero'
          }`}
        >
          {photo ? (
            <Image
              source={remoteImage(photo, photoKey)}
              cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
              style={{ position: 'absolute', inset: 0 }}
              contentFit="cover"
            />
          ) : isListing ? (
            <Package size={24} color={c.ink3} strokeWidth={1.7} />
          ) : (
            <Text className="text-[21px] font-semibold text-wk-lime">{initialsOf(name)}</Text>
          )}
        </View>
        <View className="gap-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="min-w-0 shrink text-[19px] font-semibold leading-6 text-wk-ink">
              {name}
            </Text>
            {verified ? <BadgeCheck size={18} color={c.brand} strokeWidth={2} /> : null}
          </View>
          {sub ? <Text className="text-[15px] text-wk-ink2">{sub}</Text> : null}
        </View>
        <View className="gap-px overflow-hidden rounded-2xl bg-wk-line">
          {facts.map((fact) => (
            <View
              key={fact.label}
              className="min-h-12 flex-row items-center gap-3 bg-wk-sf2 px-3.5"
            >
              <fact.icon size={16} color={c.ink3} strokeWidth={1.9} />
              <Text className="min-w-0 flex-1 text-[15px] text-wk-ink2">{fact.label}</Text>
              <Text
                className="max-w-[55%] text-end text-[15px] font-medium text-wk-ink"
                numberOfLines={2}
              >
                {fact.ltr ? ltr(fact.value) : fact.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </BottomSheet>
  )
}
