import { useEffect } from 'react'
import { FlatList, RefreshControl, ScrollView, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { FolderKanban, Plus, RotateCcw } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { ProjectCard, ProjectCardSkeleton } from '@/features/pm/ui/kit'
import { WkButton, WkError, WkHeroGlow } from '@/components/wk/kit'
import { PagedListFooter } from '@/components/wk/PagedListFooter'
import { useWkPalette, WK_TAB_SPACE } from '@/components/wk/palette'
import { WkSearchAddButton, WkSearchField } from '@/components/wk/SearchField'
import { usePagedList } from '@/components/wk/usePagedList'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import { LIST_PERF } from '@/lib/listPerf'
import { errorMessage } from '@/services/feedback'
import {
  listProjects,
  type Project,
  PROJECT_STATUS_OPTIONS,
  type ProjectStatus,
  type ProjectSummary,
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
export function PmProjectsScreen({ basePath = '/pm/projects' }: { basePath?: string } = {}) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { c, shadow, isDark } = useWkPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')
  const params = useLocalSearchParams<{ status?: string }>()
  const pull = usePullToRefresh()

  const list = usePagedList<Project>({
    cacheKeyPrefix: `${cacheKeys.projects}:${basePath}:cards`,
    initialFilter: parseFilter(params.status),
    fetcher: async ({ page, query, filter }) => {
      const r = await listProjects({
        page,
        limit: PAGE_SIZE,
        q: query || undefined,
        status: filter === 'ALL' || !filter ? undefined : (filter as ProjectStatus),
        includeSummary: true,
      })
      return {
        data: r.data,
        meta: { ...r.meta, summary: r.summary },
      }
    },
  })

  useEffect(() => {
    if (params.status !== undefined) list.setFilter(parseFilter(params.status))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.status])

  const summary = (list.meta?.summary as ProjectSummary | undefined) ?? null
  const filter = (list.filter || 'ALL') as Filter
  const countOf = (f: Filter) =>
    summary ? (f === 'ALL' ? summary.total : summary.counts[f]) : null
  const chips = CHIPS.includes(filter) ? CHIPS : [...CHIPS, filter]
  const noneAtAll = summary?.total === 0

  const header = (
    <View className="gap-3.5 pb-3.5">
      <WkSearchField
        value={list.query}
        onChangeText={list.setQuery}
        placeholder={t('pmPortal.searchProjects')}
        accessibilityLabel={t('pmPortal.searchProjects')}
        onSubmit={() => {
          const next = list.query.trim()
          if (next !== list.applied) list.restart({ applied: next })
        }}
        trailing={
          <WkSearchAddButton
            label={t('pmHome.newProject')}
            onPress={() => router.push(`${basePath}/new` as never)}
          />
        }
      />

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
              onPress={() => list.setFilter(f)}
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

      {list.error && list.rows.length === 0 ? (
        <WkError
          message={errorMessage(list.error, t('common.errorGeneric'))}
          onRetry={() => void list.refetch()}
        />
      ) : null}
      {list.isFirstLoad ? (
        <View className="gap-3">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </View>
      ) : null}
    </View>
  )

  const empty =
    !list.isFirstLoad && list.status === 'success' && list.rows.length === 0 ? (
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
              : list.applied
                ? t('pmPortal.noMatchQuery', { query: list.applied })
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
                onPress={() => router.push(`${basePath}/new` as never)}
              />
            ) : (
              <WkButton
                compact
                height={48}
                icon={RotateCcw}
                label={t('providerPortal.clearFilters')}
                onPress={() => list.clearAll('ALL')}
              />
            )}
          </View>
        </View>
      </Animated.View>
    ) : undefined

  return (
    <View className="flex-1 bg-wk-bg" testID="e2e-pm-projects">
      <FlatList
        data={list.isFirstLoad ? [] : list.rows}
        keyExtractor={(p) => p.id}
        {...LIST_PERF}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => router.push(`${basePath}/${item.id}` as never)}
          />
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
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
          paddingTop: insets.top + 12,
          paddingBottom: WK_TAB_SPACE + insets.bottom,
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
    </View>
  )
}
