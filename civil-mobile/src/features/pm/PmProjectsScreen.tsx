import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { FolderKanban, Plus, RotateCcw, Search, X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { ProjectCard, ProjectCardSkeleton } from '@/features/pm/ui/kit'
import { WkButton, WkError, WkHeroGlow } from '@/features/worker/ui/kit'
import { useWorkerPalette, WK_TAB_SPACE } from '@/features/worker/ui/palette'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import { errorMessage } from '@/services/feedback'
import {
  getProjectSummary,
  listProjects,
  PROJECT_STATUS_OPTIONS,
  type Project,
  type ProjectStatus,
} from '@/services/projects'
import { MONO_STYLE } from '@/theme/typography'

const PAGE_SIZE = 20
type Filter = 'ALL' | ProjectStatus
/** Chips shown in the bar; other statuses stay reachable through a deep link. */
const CHIPS: Filter[] = ['ALL', 'IN_PROGRESS', 'PLANNING', 'ON_HOLD', 'COMPLETED']
const STATUS_VALUES = PROJECT_STATUS_OPTIONS.map((o) => o.value)

function parseFilter(value: unknown): Filter {
  return STATUS_VALUES.includes(value as ProjectStatus) ? (value as ProjectStatus) : 'ALL'
}

/** PM "Projects" tab: search, status chips with counts, photo cards with progress. */
export function PmProjectsScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { c, shadow, isDark } = useWorkerPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')
  const params = useLocalSearchParams<{ status?: string }>()

  const [filter, setFilter] = useState<Filter>(() => parseFilter(params.status))
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<Project[]>([])

  const restart = useCallback((next: { filter?: Filter; applied?: string }) => {
    if (next.filter !== undefined) setFilter(next.filter)
    if (next.applied !== undefined) setApplied(next.applied)
    setPage(1)
    setRows([])
  }, [])

  useEffect(() => {
    if (params.status !== undefined) restart({ filter: parseFilter(params.status) })
  }, [params.status, restart])

  useEffect(() => {
    const next = query.trim()
    if (next === applied) return
    const id = setTimeout(() => restart({ applied: next }), 300)
    return () => clearTimeout(id)
  }, [query, applied, restart])

  const load = useCallback(
    () =>
      listProjects({
        page,
        limit: PAGE_SIZE,
        q: applied || undefined,
        status: filter === 'ALL' ? undefined : filter,
      }),
    [applied, filter, page],
  )
  const remote = useRemoteData(load, {
    cacheKey: `${cacheKeys.projects}:pm-cards:${page}:${applied}:${filter}`,
  })
  const result = remote.status === 'success' ? remote.data : null

  const loadSummary = useCallback(() => getProjectSummary(), [])
  const summaryRemote = useRemoteData(loadSummary, { cacheKey: `${cacheKeys.projects}:summary` })
  const summary = summaryRemote.status === 'success' ? summaryRemote.data.data : null

  useEffect(() => {
    if (!result) return
    setRows((current) => {
      if (result.meta.page === 1) return result.data
      const seen = new Set(current.map((p) => p.id))
      return [...current, ...result.data.filter((p) => !seen.has(p.id))]
    })
  }, [result])

  const total = result?.meta.total ?? 0
  const isFirstLoad = remote.isLoading && rows.length === 0
  const hasMore = rows.length < total
  const countOf = (f: Filter) =>
    summary ? (f === 'ALL' ? summary.total : summary.counts[f]) : null
  const chips = CHIPS.includes(filter) ? CHIPS : [...CHIPS, filter]
  const noneAtAll = summary?.total === 0

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
            placeholder={t('pmPortal.searchProjects')}
            placeholderTextColor={c.ink3}
            accessibilityLabel={t('pmPortal.searchProjects')}
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
          accessibilityLabel={t('pmHome.newProject')}
          onPress={() => router.push('/pm/projects/new' as never)}
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
        {chips.map((f) => {
          const on = f === filter
          const count = countOf(f)
          return (
            <Pressable
              key={f}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => {
                if (f !== filter) restart({ filter: f })
              }}
              className={`h-[38px] flex-row items-center gap-1.5 rounded-full border px-3.5 ${
                on ? 'border-wk-ink bg-wk-ink' : 'border-wk-line bg-wk-sf'
              }`}
            >
              <Text className={`text-[13px] font-medium ${on ? 'text-wk-bg' : 'text-wk-ink2'}`}>
                {f === 'ALL' ? t('providerPortal.all') : enumLabel(t, 'projectStatus', f)}
              </Text>
              {count != null ? (
                <Text
                  className={`text-[11px] font-medium ${on ? 'text-wk-bg' : 'text-wk-ink2'}`}
                  style={[MONO_STYLE, { opacity: 0.6 }]}
                >
                  {count}
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
      {isFirstLoad ? (
        <View className="gap-3">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </View>
      ) : null}
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
            <FolderKanban size={30} color={c.lime} strokeWidth={1.6} />
          </View>
        </View>
        <View className="items-start gap-2 px-[22px] pb-[22px] pt-5">
          <Text className="text-[17px] font-semibold text-wk-ink">
            {noneAtAll ? t('projects.empty') : t('providerPortal.noMatchTitle')}
          </Text>
          <Text className="text-[15px] leading-[22px] text-wk-ink2">
            {noneAtAll
              ? t('pmPortal.emptyBody')
              : applied
                ? t('pmPortal.noMatchQuery', { query: applied })
                : t('pmPortal.noMatchStatus', {
                    status:
                      filter === 'ALL' ? '' : enumLabel(t, 'projectStatus', filter).toLowerCase(),
                  })}
          </Text>
          <View className="mt-2">
            {noneAtAll ? (
              <WkButton
                compact
                height={48}
                icon={Plus}
                label={t('pmHome.newProject')}
                onPress={() => router.push('/pm/projects/new' as never)}
              />
            ) : (
              <WkButton
                compact
                height={48}
                icon={RotateCcw}
                label={t('providerPortal.clearFilters')}
                onPress={() => {
                  setQuery('')
                  restart({ applied: '', filter: 'ALL' })
                }}
              />
            )}
          </View>
        </View>
      </Animated.View>
    ) : null

  return (
    <View className="flex-1 bg-wk-bg" testID="e2e-pm-projects">
      <FlatList
        data={isFirstLoad ? [] : rows}
        keyExtractor={(p) => p.id}
        renderItem={({ item, index }) => (
          <ProjectCard
            project={item}
            index={index}
            onPress={() => router.push(`/pm/projects/${item.id}` as never)}
          />
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
          ) : null
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerClassName="px-5"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: WK_TAB_SPACE + insets.bottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={remote.isFetching && rows.length > 0 && page === 1}
            onRefresh={() => {
              void summaryRemote.refetch()
              if (page === 1) void remote.refetch()
              else restart({})
            }}
            tintColor={c.ink3}
            colors={[c.brand]}
          />
        }
      />
    </View>
  )
}
