import { useMemo } from 'react'
import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { FolderKanban } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import {
  ListCard,
  ListScreen,
  ProgressBar,
  StandardListRow,
  Thumbnail,
  toneForStatus,
} from '@/components/kit'
import { useResourceList } from '@/hooks/useResourceList'
import { enumLabel, enumOptions } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import { listProjects, type Project, PROJECT_STATUS_OPTIONS } from '@/services/projects'

const PAGE_SIZE = 20

type ProjectsListScreenProps = {
  basePath?: string
}

/** Shared projects list for PM and Admin portals. */
export function ProjectsListScreen({ basePath = '/pm/projects' }: ProjectsListScreenProps) {
  const { t } = useTranslation()
  const { listProps } = useResourceList(
    ({ page, query, filter }) =>
      listProjects({
        page,
        limit: PAGE_SIZE,
        q: query || undefined,
        status: (filter || undefined) as Project['status'] | undefined,
      }),
    { pageSize: PAGE_SIZE, cacheKeyPrefix: `${cacheKeys.projects}:${basePath}` },
  )
  const statusOptions = useMemo(() => enumOptions(t, 'projectStatus', PROJECT_STATUS_OPTIONS), [t])

  return (
    <ListScreen
      title={t('projects.title')}
      searchPlaceholder={t('projects.search')}
      filterOptions={statusOptions}
      allLabel={t('common.all')}
      addLabel={t('projects.add')}
      onAdd={() => router.push(`${basePath}/new` as never)}
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <ListCard
          accessibilityLabel={item.name}
          leading={<Thumbnail imageUrl={item.mainImageUrl} icon={FolderKanban} />}
          onPress={() => router.push(`${basePath}/${item.id}` as never)}
        >
          <StandardListRow
            title={item.name}
            statusLabel={enumLabel(t, 'projectStatus', item.status)}
            statusTone={toneForStatus(item.status)}
            subtitle={
              [item.code, item.type ? enumLabel(t, 'projectType', item.type) : null, item.city]
                .filter(Boolean)
                .join(' · ') || '—'
            }
            extra={
              <View className="flex-row items-center gap-3 pt-1">
                <View className="flex-1">
                  <ProgressBar value={item.progress} />
                </View>
                <Text className="text-xs font-semibold text-muted-foreground">
                  {Math.round(item.progress)}%
                </Text>
              </View>
            }
          />
        </ListCard>
      )}
      loadingLabel={t('projects.loading')}
      emptyTitle={t('projects.empty')}
      emptyDescription={t('projects.emptyHint')}
      {...listProps}
    />
  )
}
