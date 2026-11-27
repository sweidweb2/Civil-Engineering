import { useCallback, useState } from 'react'
import { FlatList, RefreshControl, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { ClipboardList } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useStatusBarStyle } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { WkButton, WkError, WkPill, WkTopBar } from '@/components/wk/kit'
import { useWkPalette, type WkTone } from '@/components/wk/palette'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel } from '@/i18n/labels'
import {
  cacheKeys,
  invalidateProjectTaskCaches,
  invalidateProjectWorkerCaches,
} from '@/lib/cacheKeys'
import { errorMessage } from '@/services/feedback'
import {
  listMyProjectTasks,
  PROJECT_TASK_STATUS_OPTIONS,
  type ProjectTask,
  type ProjectTaskStatus,
  updateMyProjectTaskStatus,
} from '@/services/project-tasks'
import {
  acceptWorkerProject,
  getMyWorkerProject,
  rejectWorkerProject,
} from '@/services/project-workers'
import { useToastSuccess } from '@/services/toast'

const TASK_TONE: Record<ProjectTaskStatus, WkTone> = {
  TODO: 'neutral',
  IN_PROGRESS: 'amber',
  DONE: 'green',
}

function ownerLabel(first: string | null, last: string | null, display: string | null) {
  return display || [first, last].filter(Boolean).join(' ') || '—'
}

/** Worker project invite detail: accept/reject when pending; own tasks when accepted. */
export function WorkerProjectDetailScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { c, shadow, isDark } = useWkPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const pull = usePullToRefresh()

  const params = useLocalSearchParams<{ projectId?: string }>()
  const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0]

  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)

  const loadProject = useCallback(async () => {
    if (!projectId) throw new Error('Project id required')
    const r = await getMyWorkerProject(projectId)
    return r.data
  }, [projectId])

  const projectRemote = useRemoteData(loadProject, {
    enabled: Boolean(projectId),
    cacheKey: projectId ? `${cacheKeys.workerProjects}:${projectId}` : undefined,
  })

  const membership = projectRemote.status === 'success' ? projectRemote.data : null
  const accepted = membership?.status === 'ACCEPTED'

  const loadTasks = useCallback(async () => {
    if (!projectId) throw new Error('Project id required')
    const r = await listMyProjectTasks(projectId, 1, 100)
    return r.data
  }, [projectId])

  const tasksRemote = useRemoteData(loadTasks, {
    enabled: Boolean(projectId) && accepted,
    cacheKey: projectId ? `${cacheKeys.projectTasks}:me:${projectId}` : undefined,
  })

  async function respond(kind: 'accept' | 'reject') {
    if (!projectId) return
    setBusy(kind)
    try {
      if (kind === 'accept') {
        await acceptWorkerProject(projectId)
        toastSuccess(t('projectTeam.accepted'))
        invalidateProjectWorkerCaches()
        await projectRemote.refetch()
        await tasksRemote.refetch()
      } else {
        await rejectWorkerProject(projectId)
        toastSuccess(t('projectTeam.rejected'))
        invalidateProjectWorkerCaches()
        router.replace('/worker/projects' as never)
      }
    } catch (err) {
      handleApiError(err, t('projectTeam.respondFailed'))
    } finally {
      setBusy(null)
    }
  }

  async function setTaskStatus(task: ProjectTask, status: ProjectTaskStatus) {
    if (!projectId || task.status === status) return
    setUpdatingTaskId(task.id)
    try {
      await updateMyProjectTaskStatus(projectId, task.id, status)
      invalidateProjectTaskCaches()
      await tasksRemote.refetch()
      toastSuccess(t('projectTeam.statusUpdated'))
    } catch (err) {
      handleApiError(err, t('projectTeam.statusUpdateFailed'))
    } finally {
      setUpdatingTaskId(null)
    }
  }

  if (!projectId) return null

  const tasks = tasksRemote.status === 'success' ? tasksRemote.data : []

  const header = membership ? (
    <View className="gap-3.5 pb-3.5">
      <View className="gap-2 rounded-[20px] bg-wk-sf p-4" style={shadow}>
        <Text className="text-[20px] font-semibold text-wk-ink">{membership.project.name}</Text>
        <Text className="text-[14px] text-wk-ink2">
          {[membership.project.city, membership.project.country].filter(Boolean).join(', ') ||
            enumLabel(t, 'projectStatus', membership.project.status)}
        </Text>
        <Text className="text-[13px] text-wk-ink3">
          {ownerLabel(
            membership.project.owner.firstName,
            membership.project.owner.lastName,
            membership.project.owner.displayName,
          )}
        </Text>
        <WkPill
          label={enumLabel(t, 'projectWorkerStatus', membership.status)}
          tone={membership.status === 'PENDING' ? 'amber' : 'green'}
        />
      </View>

      {membership.status === 'PENDING' ? (
        <View className="gap-2.5">
          <Text className="text-[14px] text-wk-ink2">{t('projectTeam.pendingInviteHint')}</Text>
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <WkButton
                variant="soft"
                height={48}
                label={t('projectTeam.rejectInvite')}
                loading={busy === 'reject'}
                disabled={busy !== null}
                onPress={() => void respond('reject')}
              />
            </View>
            <View className="flex-1">
              <WkButton
                height={48}
                label={t('projectTeam.acceptInvite')}
                loading={busy === 'accept'}
                disabled={busy !== null}
                onPress={() => void respond('accept')}
              />
            </View>
          </View>
        </View>
      ) : null}

      {accepted ? (
        <Text className="text-[15px] font-semibold text-wk-ink">{t('projectTeam.myTasks')}</Text>
      ) : null}

      {projectRemote.status === 'error' ? (
        <WkError
          message={errorMessage(projectRemote.error, t('common.errorGeneric'))}
          onRetry={() => void projectRemote.refetch()}
        />
      ) : null}
      {accepted && tasksRemote.status === 'error' ? (
        <WkError
          message={errorMessage(tasksRemote.error, t('common.errorGeneric'))}
          onRetry={() => void tasksRemote.refetch()}
        />
      ) : null}
    </View>
  ) : projectRemote.isLoading ? (
    <View className="py-6">
      <Text className="text-wk-ink3">{t('common.loading')}</Text>
    </View>
  ) : null

  return (
    <View className="flex-1 bg-wk-bg" testID="e2e-worker-project-detail">
      <WkTopBar title={t('projectTeam.myProjects')} backHref="/worker/projects" />
      <FlatList
        data={accepted && !tasksRemote.isLoading ? tasks : []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header ?? undefined}
        ListEmptyComponent={
          accepted && !tasksRemote.isLoading ? (
            <View className="items-center gap-2 px-6 py-8">
              <ClipboardList size={28} color={c.brand} strokeWidth={1.75} />
              <Text className="text-[16px] font-semibold text-wk-ink">
                {t('projectTeam.myTasksEmpty')}
              </Text>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <View className="mb-3 gap-2.5 rounded-[18px] bg-wk-sf p-3.5" style={shadow}>
            <View className="flex-row items-start gap-2">
              <Text className="min-w-0 flex-1 text-[15px] font-semibold text-wk-ink">
                {item.title}
              </Text>
              <WkPill
                label={enumLabel(t, 'projectTaskStatus', item.status)}
                tone={TASK_TONE[item.status]}
              />
            </View>
            {item.description ? (
              <Text className="text-[13px] text-wk-ink2">{item.description}</Text>
            ) : null}
            <View className="flex-row flex-wrap gap-2">
              {PROJECT_TASK_STATUS_OPTIONS.map((status) => (
                <Pressable
                  key={status}
                  disabled={updatingTaskId === item.id}
                  onPress={() => void setTaskStatus(item, status)}
                  className={`rounded-full px-3 py-1.5 ${item.status === status ? 'bg-wk-ink' : 'bg-wk-sf2'}`}
                >
                  <Text
                    className={`text-[12px] font-medium ${item.status === status ? 'text-wk-bg' : 'text-wk-ink'}`}
                  >
                    {enumLabel(t, 'projectTaskStatus', status)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        contentContainerClassName="px-5"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={
              (projectRemote.isFetching && !projectRemote.isLoading) ||
              (accepted && tasksRemote.isFetching && !tasksRemote.isLoading)
            }
            onRefresh={() =>
              pull(async () => {
                await projectRemote.refetch()
                if (accepted) await tasksRemote.refetch()
              })
            }
            tintColor={c.ink3}
            colors={[c.brand]}
          />
        }
      />
    </View>
  )
}
