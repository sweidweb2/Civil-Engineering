import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, Text, TextInput, View } from 'react-native'
import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { BadgeCheck, HardHat, Search, SearchX, X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { DirectoryDetailSheet, type DirectoryEntry } from '@/features/pm/DirectoryDetailSheet'
import { specialtyLabel } from '@/features/worker/specialties'
import { WkButton, WkError, WkSkeletonCard, WkTopBar } from '@/features/worker/ui/kit'
import { useWorkerPalette } from '@/features/worker/ui/palette'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useRemoteData } from '@/hooks/useRemoteData'
import { cacheKeys } from '@/lib/cacheKeys'
import { REMOTE_IMAGE_CACHE_POLICY, remoteImage } from '@/lib/imageSource'
import { mergePageRows } from '@/lib/pagedRows'
import { initialsOf } from '@/lib/user'
import { errorMessage } from '@/services/feedback'
import { directoryWorkerName, listWorkers, type WorkerDirectoryItem } from '@/services/workers'

const PAGE_SIZE = 20

/**
 * Workers under one specialty. Opened from the PM/admin directory specialty cards.
 */
export function PmSpecialtyWorkersScreen({
  basePath = '/pm/directory',
}: {
  basePath?: string
} = {}) {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const { c, shadow, isDark } = useWorkerPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')
  const params = useLocalSearchParams<{ id?: string }>()
  const specialtyId = typeof params.id === 'string' ? params.id : params.id?.[0]
  const title = specialtyLabel(specialtyId, i18n.language) || t('pmPortal.workers')

  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [page, setPage] = useState(1)
  const [workers, setWorkers] = useState<WorkerDirectoryItem[]>([])
  const [open, setOpen] = useState<DirectoryEntry | null>(null)

  const restart = useCallback((next?: { applied?: string }) => {
    if (next?.applied !== undefined) setApplied(next.applied)
    setPage(1)
    setWorkers([])
  }, [])

  useEffect(() => {
    const next = query.trim()
    if (next === applied) return
    const id = setTimeout(() => restart({ applied: next }), 300)
    return () => clearTimeout(id)
  }, [query, applied, restart])

  const loadWorkers = useCallback(async () => {
    if (!specialtyId) throw new Error('Specialty id required')
    const r = await listWorkers({
      page,
      limit: PAGE_SIZE,
      q: applied || undefined,
      specialty: specialtyId,
    })
    return { rows: r.data, total: r.meta.total, page: r.meta.page }
  }, [applied, page, specialtyId])

  const pull = usePullToRefresh()
  const workersRemote = useRemoteData(loadWorkers, {
    enabled: Boolean(specialtyId),
    cacheKey: specialtyId
      ? `${cacheKeys.directory}:pm:specialty:${specialtyId}:${page}:${applied}`
      : undefined,
  })
  const result = workersRemote.status === 'success' ? workersRemote.data : null

  useEffect(() => {
    if (!result) return
    setWorkers((current) => {
      if (result.page === 1) return result.rows
      return mergePageRows(current, result.rows)
    })
  }, [result])

  const total = result?.total ?? 0
  const isFirstLoad = workersRemote.isLoading && workers.length === 0
  const hasMore = workers.length < total

  function workerRow(worker: WorkerDirectoryItem) {
    const name = directoryWorkerName(worker)
    const sub = [worker.headline, worker.city].filter(Boolean).join(' · ')
    const photo = worker.avatarImageUrl ?? null
    const photoKey = worker.avatarUrl
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={name}
        onPress={() => setOpen({ kind: 'worker', id: worker.id, worker })}
        className="min-h-[76px] flex-row items-center gap-3.5 bg-wk-sf px-3.5 py-3 active:bg-wk-sf2"
      >
        <View className="size-[52px] items-center justify-center overflow-hidden rounded-full bg-wk-hero">
          {photo ? (
            <Image
              source={remoteImage(photo, photoKey)}
              cachePolicy={REMOTE_IMAGE_CACHE_POLICY}
              style={{ position: 'absolute', inset: 0 }}
              contentFit="cover"
              recyclingKey={photoKey ?? photo}
            />
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
            {worker.isVerified ? <BadgeCheck size={15} color={c.brand} strokeWidth={2} /> : null}
          </View>
          <Text className="text-[13px] text-wk-ink2" numberOfLines={1}>
            {sub || '—'}
          </Text>
        </View>
        <View className="h-[22px] justify-center rounded-full bg-wk-sf2 px-2">
          <Text className="text-[11px] font-medium text-wk-ink2">{t('pmPortal.worker')}</Text>
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
          placeholder={t('pmPortal.searchWorkers')}
          placeholderTextColor={c.ink3}
          accessibilityLabel={t('pmPortal.searchWorkers')}
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
      {workersRemote.status === 'error' && workers.length === 0 ? (
        <WkError
          message={errorMessage(workersRemote.error, t('common.errorGeneric'))}
          onRetry={() => void workersRemote.refetch()}
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
    !isFirstLoad && workersRemote.status === 'success' && workers.length === 0 ? (
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
          {applied ? t('pmPortal.noMatches') : t('pmPortal.specialtyWorkersEmpty')}
        </Text>
        <Text className="max-w-[260px] text-center text-[15px] leading-[22px] text-wk-ink2">
          {applied ? t('pmPortal.noMatchesHint') : t('pmPortal.specialtyWorkersEmptyHint')}
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
    <View className="flex-1 bg-wk-bg" testID="e2e-pm-specialty-workers">
      <WkTopBar title={title} backHref={basePath} count={total ? String(total) : undefined} />
      <FlatList
        data={isFirstLoad ? [] : workers}
        keyExtractor={(worker) => worker.id}
        renderItem={({ item, index }) => (
          <View
            className={`overflow-hidden ${index === 0 ? 'rounded-t-[22px]' : ''} ${
              index === workers.length - 1 ? 'rounded-b-[22px]' : 'border-b border-wk-line'
            }`}
          >
            {workerRow(item)}
          </View>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          hasMore && workers.length > 0 ? (
            <View className="pt-4">
              <WkButton
                variant="soft"
                height={48}
                label={t('providerPortal.loadMore')}
                loading={workersRemote.isFetching}
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
            refreshing={workersRemote.isFetching && workers.length > 0 && page === 1}
            onRefresh={() => pull(() => (page === 1 ? workersRemote.refetch() : restart()))}
            tintColor={c.ink3}
            colors={[c.brand]}
          />
        }
      />
      <DirectoryDetailSheet entry={open} onClose={() => setOpen(null)} />
    </View>
  )
}
