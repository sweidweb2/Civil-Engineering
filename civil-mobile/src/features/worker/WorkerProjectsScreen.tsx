import { useCallback } from 'react'
import { FlatList, RefreshControl, Text, View } from 'react-native'
import { router } from 'expo-router'
import { ChevronRight, FolderKanban } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { flipStyle, WkError, WkPill } from '@/components/wk/kit'
import { useWkPalette, WK_TAB_SPACE, type WkTone } from '@/components/wk/palette'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys } from '@/lib/cacheKeys'
import { errorMessage } from '@/services/feedback'
import {
  listMyWorkerProjects,
  type ProjectWorkerStatus,
  type WorkerProjectSummary,
} from '@/services/project-workers'

const TONE: Record<'PENDING' | 'ACCEPTED', WkTone> = {
  PENDING: 'amber',
  ACCEPTED: 'green',
}

function ownerName(row: WorkerProjectSummary) {
  const o = row.project.owner
  return o.displayName || [o.firstName, o.lastName].filter(Boolean).join(' ') || '—'
}

/** Worker portal: list of PENDING + ACCEPTED project invites. */
export function WorkerProjectsScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { c, shadow, isDark } = useWkPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')
  const pull = usePullToRefresh()

  const load = useCallback(async () => {
    const r = await listMyWorkerProjects(1, 50)
    return r.data
  }, [])

  const remote = useRemoteData(load, {
    cacheKey: cacheKeys.workerProjects,
  })

  const rows = remote.status === 'success' ? remote.data : []

  return (
    <View className="flex-1 bg-wk-bg" testID="e2e-worker-projects">
      <FlatList
        data={remote.isLoading ? [] : rows}
        keyExtractor={(item) => item.projectWorkerId}
        ListHeaderComponent={
          <View className="gap-1 pb-3.5">
            <Text className="text-[22px] font-semibold tracking-tight text-wk-ink">
              {t('projectTeam.myProjects')}
            </Text>
            {remote.status === 'error' ? (
              <WkError
                message={errorMessage(remote.error, t('common.errorGeneric'))}
                onRetry={() => void remote.refetch()}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !remote.isLoading && remote.status === 'success' ? (
            <View className="items-center gap-2 px-6 py-12">
              <FolderKanban size={28} color={c.brand} strokeWidth={1.75} />
              <Text className="text-[17px] font-semibold text-wk-ink">
                {t('projectTeam.myProjectsEmpty')}
              </Text>
              <Text className="max-w-[260px] text-center text-[15px] text-wk-ink2">
                {t('projectTeam.myProjectsEmptyHint')}
              </Text>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/worker/projects/${item.project.id}` as never)}
            className="mb-3 flex-row items-center gap-3 rounded-[20px] bg-wk-sf p-4 active:opacity-90"
            style={shadow}
          >
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-[16px] font-semibold text-wk-ink" numberOfLines={1}>
                {item.project.name}
              </Text>
              <Text className="text-[13px] text-wk-ink2" numberOfLines={1}>
                {[item.project.city, ownerName(item)].filter(Boolean).join(' · ')}
              </Text>
              <WkPill
                label={enumLabel(t, 'projectWorkerStatus', item.status as ProjectWorkerStatus)}
                tone={TONE[item.status as 'PENDING' | 'ACCEPTED']}
              />
            </View>
            <View style={flipStyle()}>
              <ChevronRight size={20} color={c.ink3} />
            </View>
          </Pressable>
        )}
        contentContainerClassName="px-5"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: WK_TAB_SPACE + insets.bottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={remote.isFetching && !remote.isLoading}
            onRefresh={() => pull(() => remote.refetch())}
            tintColor={c.ink3}
            colors={[c.brand]}
          />
        }
      />
    </View>
  )
}
