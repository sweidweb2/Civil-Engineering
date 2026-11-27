import { useState } from 'react'
import { FlatList, RefreshControl, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { BadgeCheck, HardHat, SearchX } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { WkButton, WkError, WkSkeletonCard, WkTopBar } from '@/components/wk/kit'
import { PagedListFooter } from '@/components/wk/PagedListFooter'
import { useWkPalette } from '@/components/wk/palette'
import { WkSearchField } from '@/components/wk/SearchField'
import { usePagedList } from '@/components/wk/usePagedList'
import { DirectoryDetailSheet, type DirectoryEntry } from '@/features/pm/DirectoryDetailSheet'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { cacheKeys } from '@/lib/cacheKeys'
import { REMOTE_IMAGE_CACHE_POLICY, remoteImage } from '@/lib/imageSource'
import { LIST_PERF } from '@/lib/listPerf'
import { specialtyLabel } from '@/lib/specialties'
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
  const { c, shadow, isDark } = useWkPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')
  const params = useLocalSearchParams<{ id?: string }>()
  const specialtyId = typeof params.id === 'string' ? params.id : params.id?.[0]
  const title = specialtyLabel(specialtyId, i18n.language) || t('pmPortal.workers')
  const pull = usePullToRefresh()
  const [open, setOpen] = useState<DirectoryEntry | null>(null)

  const list = usePagedList<WorkerDirectoryItem>({
    cacheKeyPrefix: specialtyId
      ? `${cacheKeys.directory}:pm:specialty:${specialtyId}`
      : `${cacheKeys.directory}:pm:specialty`,
    enabled: Boolean(specialtyId),
    resetKey: specialtyId,
    fetcher: async ({ page, query }) => {
      if (!specialtyId) throw new Error('Specialty id required')
      const r = await listWorkers({
        page,
        limit: PAGE_SIZE,
        q: query || undefined,
        specialty: specialtyId,
      })
      return { data: r.data, meta: { total: r.meta.total, page: r.meta.page } }
    },
  })

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
      <WkSearchField
        value={list.query}
        onChangeText={list.setQuery}
        placeholder={t('pmPortal.searchWorkers')}
        accessibilityLabel={t('pmPortal.searchWorkers')}
      />
      {list.error && list.rows.length === 0 ? (
        <WkError
          message={errorMessage(list.error, t('common.errorGeneric'))}
          onRetry={() => void list.refetch()}
        />
      ) : null}
      {list.isFirstLoad ? (
        <View className="gap-3">
          <WkSkeletonCard />
          <WkSkeletonCard />
        </View>
      ) : null}
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
            <HardHat size={28} color={c.brand} strokeWidth={1.75} />
          )}
        </View>
        <Text className="mt-1.5 text-[17px] font-semibold text-wk-ink">
          {list.applied ? t('pmPortal.noMatches') : t('pmPortal.specialtyWorkersEmpty')}
        </Text>
        <Text className="max-w-[260px] text-center text-[15px] leading-[22px] text-wk-ink2">
          {list.applied ? t('pmPortal.noMatchesHint') : t('pmPortal.specialtyWorkersEmptyHint')}
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
    <View className="flex-1 bg-wk-bg" testID="e2e-pm-specialty-workers">
      <WkTopBar
        title={title}
        backHref={basePath}
        count={list.total ? String(list.total) : undefined}
      />
      <FlatList
        data={list.isFirstLoad ? [] : list.rows}
        keyExtractor={(worker) => worker.id}
        {...LIST_PERF}
        renderItem={({ item, index }) => (
          <View
            className={`overflow-hidden ${index === 0 ? 'rounded-t-[22px]' : ''} ${
              index === list.rows.length - 1 ? 'rounded-b-[22px]' : 'border-b border-wk-line'
            }`}
          >
            {workerRow(item)}
          </View>
        )}
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
