import { useCallback, useMemo, useState } from 'react'
import { FlatList, RefreshControl, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { ClipboardList, Plus, Search, Trash2, UserPlus, Users } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BottomSheet, useStatusBarStyle } from '@/components/kit'
import { Pressable } from '@/components/ui/pressable'
import { WkField } from '@/components/wk/forms'
import {
  WkButton,
  WkConfirm,
  type WkConfirmState,
  WkError,
  WkPill,
  WkTopBar,
} from '@/components/wk/kit'
import { useWkPalette, type WkTone } from '@/components/wk/palette'
import { WkSegmented } from '@/components/wk/settings'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel } from '@/i18n/labels'
import {
  cacheKeys,
  invalidateProjectTaskCaches,
  invalidateProjectWorkerCaches,
} from '@/lib/cacheKeys'
import { ltr } from '@/lib/rtl'
import { errorMessage } from '@/services/feedback'
import {
  createProjectTask,
  deleteProjectTask,
  listProjectTasks,
  PROJECT_TASK_STATUS_OPTIONS,
  type ProjectTask,
  type ProjectTaskStatus,
  updateProjectTask,
} from '@/services/project-tasks'
import {
  inviteProjectWorker,
  listProjectWorkers,
  type ProjectWorker,
  projectWorkerName,
  type ProjectWorkerStatus,
  removeProjectWorker,
} from '@/services/project-workers'
import { useToastSuccess } from '@/services/toast'
import { directoryWorkerName, listWorkers, type WorkerDirectoryItem } from '@/services/workers'

type Tab = 'workers' | 'tasks'

const WORKER_TONE: Record<ProjectWorkerStatus, WkTone> = {
  PENDING: 'amber',
  ACCEPTED: 'green',
  REJECTED: 'neutral',
}

const TASK_TONE: Record<ProjectTaskStatus, WkTone> = {
  TODO: 'neutral',
  IN_PROGRESS: 'amber',
  DONE: 'green',
}

/**
 * PM project → My workers: Workers | Tasks. Invite directory workers,
 * manage flat tasks assigned to accepted workers.
 */
export function PmProjectWorkersScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { c, shadow, isDark } = useWkPalette()
  useStatusBarStyle(isDark ? 'light' : 'dark')
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const pull = usePullToRefresh()

  const params = useLocalSearchParams<{ id?: string }>()
  const projectId = typeof params.id === 'string' ? params.id : params.id?.[0]

  const [tab, setTab] = useState<Tab>('workers')
  const [confirm, setConfirm] = useState<WkConfirmState | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteQ, setInviteQ] = useState('')
  const [invitingId, setInvitingId] = useState<string | null>(null)
  const [taskOpen, setTaskOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskStatus, setTaskStatus] = useState<ProjectTaskStatus>('TODO')
  const [taskAssigneeId, setTaskAssigneeId] = useState<string | null>(null)
  const [taskSaving, setTaskSaving] = useState(false)

  const loadWorkers = useCallback(async () => {
    if (!projectId) throw new Error('Project id required')
    const r = await listProjectWorkers(projectId, 1, 100)
    return r.data
  }, [projectId])

  const loadTasks = useCallback(async () => {
    if (!projectId) throw new Error('Project id required')
    const r = await listProjectTasks(projectId, 1, 100)
    return r.data
  }, [projectId])

  const workersRemote = useRemoteData(loadWorkers, {
    enabled: Boolean(projectId),
    cacheKey: projectId ? `${cacheKeys.projectWorkers}:${projectId}` : undefined,
  })
  const tasksRemote = useRemoteData(loadTasks, {
    enabled: Boolean(projectId),
    cacheKey: projectId ? `${cacheKeys.projectTasks}:${projectId}` : undefined,
  })

  const loadDirectory = useCallback(async () => {
    const r = await listWorkers({ page: 1, limit: 40, q: inviteQ.trim() || undefined })
    return r.data
  }, [inviteQ])

  const directoryRemote = useRemoteData(loadDirectory, {
    enabled: inviteOpen,
    cacheKey: `${cacheKeys.directory}:invite:${inviteQ.trim()}`,
  })

  const workers = workersRemote.status === 'success' ? workersRemote.data : []
  const tasks = tasksRemote.status === 'success' ? tasksRemote.data : []
  const accepted = useMemo(() => workers.filter((w) => w.status === 'ACCEPTED'), [workers])
  const invitedIds = useMemo(
    () => new Set(workers.filter((w) => w.status !== 'REJECTED').map((w) => w.workerUserId)),
    [workers],
  )

  function openNewTask() {
    setEditingTask(null)
    setTaskTitle('')
    setTaskDescription('')
    setTaskStatus('TODO')
    setTaskAssigneeId(null)
    setTaskOpen(true)
  }

  function openEditTask(task: ProjectTask) {
    setEditingTask(task)
    setTaskTitle(task.title)
    setTaskDescription(task.description ?? '')
    setTaskStatus(task.status)
    setTaskAssigneeId(task.assigneeProjectWorkerId)
    setTaskOpen(true)
  }

  async function onInvite(worker: WorkerDirectoryItem) {
    if (!projectId) return
    setInvitingId(worker.userId)
    try {
      await inviteProjectWorker(projectId, worker.userId)
      invalidateProjectWorkerCaches()
      await workersRemote.refetch()
      toastSuccess(t('projectTeam.invited'))
      setInviteOpen(false)
    } catch (err) {
      handleApiError(err, t('projectTeam.inviteFailed'))
    } finally {
      setInvitingId(null)
    }
  }

  function askRemove(row: ProjectWorker) {
    setConfirm({
      title:
        row.status === 'PENDING'
          ? t('projectTeam.cancelInviteTitle')
          : t('projectTeam.removeWorkerTitle'),
      body:
        row.status === 'PENDING'
          ? t('projectTeam.cancelInviteBody', { name: projectWorkerName(row.worker) })
          : t('projectTeam.removeWorkerBody', { name: projectWorkerName(row.worker) }),
      cta: row.status === 'PENDING' ? t('projectTeam.cancelInvite') : t('common.remove'),
      tone: 'danger',
      onConfirm: () => {
        setConfirm(null)
        void (async () => {
          if (!projectId) return
          try {
            await removeProjectWorker(projectId, row.id)
            invalidateProjectWorkerCaches()
            await Promise.all([workersRemote.refetch(), tasksRemote.refetch()])
            toastSuccess(t('projectTeam.removed'))
          } catch (err) {
            handleApiError(err, t('projectTeam.removeFailed'))
          }
        })()
      },
    })
  }

  async function saveTask() {
    if (!projectId) return
    const title = taskTitle.trim()
    if (!title) return
    setTaskSaving(true)
    try {
      const payload = {
        title,
        description: taskDescription.trim() || null,
        status: taskStatus,
        assigneeProjectWorkerId: taskAssigneeId,
      }
      if (editingTask) {
        await updateProjectTask(projectId, editingTask.id, payload)
        toastSuccess(t('projectTeam.taskSaved'))
      } else {
        await createProjectTask(projectId, payload)
        toastSuccess(t('projectTeam.taskCreated'))
      }
      invalidateProjectTaskCaches()
      await tasksRemote.refetch()
      setTaskOpen(false)
    } catch (err) {
      handleApiError(err, t('projectTeam.taskSaveFailed'))
    } finally {
      setTaskSaving(false)
    }
  }

  function askDeleteTask(task: ProjectTask) {
    setConfirm({
      title: t('projectTeam.deleteTaskTitle'),
      body: t('projectTeam.deleteTaskBody', { title: task.title }),
      cta: t('common.delete'),
      tone: 'danger',
      onConfirm: () => {
        setConfirm(null)
        void (async () => {
          if (!projectId) return
          try {
            await deleteProjectTask(projectId, task.id)
            invalidateProjectTaskCaches()
            await tasksRemote.refetch()
            toastSuccess(t('projectTeam.taskDeleted'))
          } catch (err) {
            handleApiError(err, t('projectTeam.taskDeleteFailed'))
          }
        })()
      },
    })
  }

  if (!projectId) return null

  const header = (
    <View className="gap-3.5 pb-3.5">
      <WkSegmented<Tab>
        options={[
          { value: 'workers', label: t('projectTeam.workersTab') },
          { value: 'tasks', label: t('projectTeam.tasksTab') },
        ]}
        value={tab}
        onChange={setTab}
      />
      <View className="flex-row justify-end">
        <WkButton
          compact
          height={44}
          icon={tab === 'workers' ? UserPlus : Plus}
          label={tab === 'workers' ? t('projectTeam.inviteWorker') : t('projectTeam.newTask')}
          onPress={() => (tab === 'workers' ? setInviteOpen(true) : openNewTask())}
        />
      </View>
      {tab === 'workers' && workersRemote.status === 'error' ? (
        <WkError
          message={errorMessage(workersRemote.error, t('common.errorGeneric'))}
          onRetry={() => void workersRemote.refetch()}
        />
      ) : null}
      {tab === 'tasks' && tasksRemote.status === 'error' ? (
        <WkError
          message={errorMessage(tasksRemote.error, t('common.errorGeneric'))}
          onRetry={() => void tasksRemote.refetch()}
        />
      ) : null}
    </View>
  )

  return (
    <View className="flex-1 bg-wk-bg" testID="e2e-pm-project-workers">
      <WkTopBar title={t('projectTeam.title')} backHref={`/pm/projects/${projectId}`} />
      {tab === 'workers' ? (
        <FlatList
          data={workersRemote.isLoading ? [] : workers}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          ListEmptyComponent={
            !workersRemote.isLoading ? (
              <View className="items-center gap-2 px-6 py-10">
                <Users size={28} color={c.brand} strokeWidth={1.75} />
                <Text className="text-[17px] font-semibold text-wk-ink">
                  {t('projectTeam.workersEmpty')}
                </Text>
                <Text className="max-w-[260px] text-center text-[15px] text-wk-ink2">
                  {t('projectTeam.workersEmptyHint')}
                </Text>
              </View>
            ) : undefined
          }
          renderItem={({ item }) => (
            <View
              className="mb-3 flex-row items-center gap-3 rounded-[18px] bg-wk-sf p-3.5"
              style={shadow}
            >
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-[15px] font-semibold text-wk-ink" numberOfLines={1}>
                  {projectWorkerName(item.worker)}
                </Text>
                <Text className="text-[12px] text-wk-ink3" numberOfLines={1}>
                  {ltr(item.worker.email)}
                </Text>
                <WkPill
                  label={enumLabel(t, 'projectWorkerStatus', item.status)}
                  tone={WORKER_TONE[item.status]}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.remove')}
                onPress={() => askRemove(item)}
                className="size-11 items-center justify-center rounded-[12px] bg-wk-red-soft"
              >
                <Trash2 size={18} color={c.red} strokeWidth={1.9} />
              </Pressable>
            </View>
          )}
          contentContainerClassName="px-5"
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 + insets.bottom }}
          refreshControl={
            <RefreshControl
              refreshing={workersRemote.isFetching && !workersRemote.isLoading}
              onRefresh={() => pull(() => workersRemote.refetch())}
              tintColor={c.ink3}
              colors={[c.brand]}
            />
          }
        />
      ) : (
        <FlatList
          data={tasksRemote.isLoading ? [] : tasks}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          ListEmptyComponent={
            !tasksRemote.isLoading ? (
              <View className="items-center gap-2 px-6 py-10">
                <ClipboardList size={28} color={c.brand} strokeWidth={1.75} />
                <Text className="text-[17px] font-semibold text-wk-ink">
                  {t('projectTeam.tasksEmpty')}
                </Text>
                <Text className="max-w-[260px] text-center text-[15px] text-wk-ink2">
                  {t('projectTeam.tasksEmptyHint')}
                </Text>
              </View>
            ) : undefined
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openEditTask(item)}
              className="mb-3 gap-2 rounded-[18px] bg-wk-sf p-3.5 active:opacity-90"
              style={shadow}
            >
              <View className="flex-row items-start gap-2">
                <Text className="min-w-0 flex-1 text-[15px] font-semibold text-wk-ink">
                  {item.title}
                </Text>
                <WkPill
                  label={enumLabel(t, 'projectTaskStatus', item.status)}
                  tone={TASK_TONE[item.status]}
                />
              </View>
              {item.assignee ? (
                <Text className="text-[12px] text-wk-ink3" numberOfLines={1}>
                  {item.assignee.displayName ||
                    [item.assignee.firstName, item.assignee.lastName].filter(Boolean).join(' ') ||
                    item.assignee.email}
                </Text>
              ) : (
                <Text className="text-[12px] text-wk-ink3">{t('projectTeam.unassigned')}</Text>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.delete')}
                onPress={() => askDeleteTask(item)}
                className="self-start pt-1"
              >
                <Text className="text-[13px] font-medium text-wk-red">{t('common.delete')}</Text>
              </Pressable>
            </Pressable>
          )}
          contentContainerClassName="px-5"
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 + insets.bottom }}
          refreshControl={
            <RefreshControl
              refreshing={tasksRemote.isFetching && !tasksRemote.isLoading}
              onRefresh={() => pull(() => tasksRemote.refetch())}
              tintColor={c.ink3}
              colors={[c.brand]}
            />
          }
        />
      )}

      <BottomSheet
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title={t('projectTeam.inviteWorker')}
      >
        <View className="gap-3 pb-4">
          <View className="h-12 flex-row items-center gap-2.5 rounded-[14px] border border-wk-line bg-wk-sf ps-3.5">
            <Search size={18} color={c.ink3} strokeWidth={1.9} />
            <TextInput
              value={inviteQ}
              onChangeText={setInviteQ}
              placeholder={t('pmPortal.searchWorkers')}
              placeholderTextColor={c.ink3}
              className="h-full min-w-0 flex-1 text-[15px] text-wk-ink"
              autoCorrect={false}
            />
          </View>
          {(directoryRemote.status === 'success' ? directoryRemote.data : []).map((worker) => {
            const already = invitedIds.has(worker.userId)
            return (
              <Pressable
                key={worker.userId}
                disabled={already || invitingId === worker.userId}
                onPress={() => void onInvite(worker)}
                className="rounded-[14px] border border-wk-line bg-wk-sf px-3.5 py-3 active:opacity-90"
              >
                <Text className="text-[15px] font-semibold text-wk-ink">
                  {directoryWorkerName(worker)}
                </Text>
                <Text className="text-[12px] text-wk-ink3">
                  {already
                    ? t('projectTeam.alreadyInvited')
                    : [worker.specialty, worker.city].filter(Boolean).join(' · ') ||
                      t('projectTeam.directoryWorker')}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={taskOpen}
        onClose={() => setTaskOpen(false)}
        title={editingTask ? t('projectTeam.editTask') : t('projectTeam.newTask')}
      >
        <View className="gap-3 pb-4">
          <WkField
            label={t('projectTeam.taskTitle')}
            required
            value={taskTitle}
            onChangeText={setTaskTitle}
          />
          <WkField
            label={t('common.description')}
            multiline
            value={taskDescription}
            onChangeText={setTaskDescription}
          />
          <Text className="text-[13px] font-medium text-wk-ink2">
            {t('projectTeam.taskStatus')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {PROJECT_TASK_STATUS_OPTIONS.map((status) => (
              <Pressable
                key={status}
                onPress={() => setTaskStatus(status)}
                className={`rounded-full px-3 py-2 ${taskStatus === status ? 'bg-wk-ink' : 'bg-wk-sf2'}`}
              >
                <Text
                  className={`text-[13px] font-medium ${taskStatus === status ? 'text-wk-bg' : 'text-wk-ink'}`}
                >
                  {enumLabel(t, 'projectTaskStatus', status)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text className="text-[13px] font-medium text-wk-ink2">{t('projectTeam.assignee')}</Text>
          <Pressable
            onPress={() => setTaskAssigneeId(null)}
            className={`rounded-[12px] px-3 py-2.5 ${taskAssigneeId === null ? 'bg-wk-ink' : 'bg-wk-sf2'}`}
          >
            <Text
              className={`text-[14px] ${taskAssigneeId === null ? 'text-wk-bg' : 'text-wk-ink'}`}
            >
              {t('projectTeam.unassigned')}
            </Text>
          </Pressable>
          {accepted.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => setTaskAssigneeId(w.id)}
              className={`rounded-[12px] px-3 py-2.5 ${taskAssigneeId === w.id ? 'bg-wk-ink' : 'bg-wk-sf2'}`}
            >
              <Text
                className={`text-[14px] ${taskAssigneeId === w.id ? 'text-wk-bg' : 'text-wk-ink'}`}
              >
                {projectWorkerName(w.worker)}
              </Text>
            </Pressable>
          ))}
          <WkButton
            label={editingTask ? t('common.save') : t('projectTeam.createTask')}
            loading={taskSaving}
            onPress={() => void saveTask()}
          />
        </View>
      </BottomSheet>

      <WkConfirm state={confirm} onCancel={() => setConfirm(null)} />
    </View>
  )
}
