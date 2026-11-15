import { useCallback, useMemo } from 'react'
import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { FolderKanban } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import {
  ListCard,
  ListScreen,
  ProgressBar,
  StatusPill,
  Thumbnail,
  toneForStatus,
} from '@/components/kit'
import { listView, useListState } from '@/hooks/useListState'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel, enumOptions } from '@/i18n/labels'
import { listProjects, type Project, PROJECT_STATUS_OPTIONS } from '@/services/projects'

const PAGE_SIZE = 20

type PmProjectsScreenProps = {
  basePath?: string
}

export function PmProjectsScreen({ basePath = '/pm/projects' }: PmProjectsScreenProps) {
  const { t } = useTranslation()
  const list = useListState()

  const load = useCallback(
    () =>
      listProjects({
        page: list.page,
        limit: PAGE_SIZE,
        q: list.appliedQuery || undefined,
        status: (list.filter || undefined) as Project['status'] | undefined,
      }),
    [list.appliedQuery, list.filter, list.page],
  )
  const remote = useRemoteData(load)
  const view = listView(remote, PAGE_SIZE)
  const statusOptions = useMemo(() => enumOptions(t, 'projectStatus', PROJECT_STATUS_OPTIONS), [t])

  return (
    <ListScreen
      title={t('projects.title')}
      subtitle={view.total ? t('common.total', { count: view.total }) : undefined}
      searchPlaceholder={t('projects.search')}
      query={list.query}
      onQueryChange={list.setQuery}
      onSearch={list.onSearch}
      filterOptions={statusOptions}
      filterValue={list.filter}
      onFilterChange={list.onFilter}
      allLabel={t('common.all')}
      addLabel={t('projects.add')}
      onAdd={() => router.push(`${basePath}/new` as never)}
      data={view.rows}
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <ListCard
          accessibilityLabel={item.name}
          leading={<Thumbnail imageUrl={item.mainImageUrl} icon={FolderKanban} />}
          onPress={() => router.push(`${basePath}/${item.id}` as never)}
        >
          <View className="flex-row items-start justify-between gap-2">
            <Text className="min-w-0 flex-1 text-base font-bold text-foreground" numberOfLines={1}>
              {item.name}
            </Text>
            <StatusPill
              label={enumLabel(t, 'projectStatus', item.status)}
              tone={toneForStatus(item.status)}
            />
          </View>
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {[item.code, item.type ? enumLabel(t, 'projectType', item.type) : null, item.city]
              .filter(Boolean)
              .join(' · ') || '—'}
          </Text>
          <View className="flex-row items-center gap-3 pt-1">
            <View className="flex-1">
              <ProgressBar value={item.progress} />
            </View>
            <Text className="text-xs font-semibold text-muted-foreground">
              {Math.round(item.progress)}%
            </Text>
          </View>
        </ListCard>
      )}
      isInitialLoading={view.isInitialLoading}
      isRefreshing={view.isRefreshing}
      error={view.error}
      onRefresh={() => void remote.refetch()}
      loadingLabel={t('projects.loading')}
      page={list.page}
      totalPages={view.totalPages}
      onPageChange={list.setPage}
      emptyTitle={t('projects.empty')}
      emptyDescription={t('projects.emptyHint')}
    />
  )
}
