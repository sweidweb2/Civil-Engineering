import { useState } from 'react'
import { Check, Trash2, Undo2, UserCheck } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { shortDate } from '@/features/admin/ui'
import { WkConfirm, type WkConfirmState } from '@/features/worker/ui/kit'
import { usePagedList, WkListRow, WkListScreen, WkMedia } from '@/features/worker/ui/list'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys, invalidateAdminCaches } from '@/lib/cacheKeys'
import { ltr } from '@/lib/rtl'
import { userDisplayLabel, userDisplayName } from '@/lib/user'
import { useToastSuccess } from '@/services/toast'
import {
  type ApprovalCounts,
  type ApprovalListStatus,
  approveUser,
  deleteApproval,
  listApprovals,
  unapproveUser,
  type User,
} from '@/services/users'

const PAGE_SIZE = 20

/** Admin → Registration requests: approve / unapprove / remove sign-ups. */
export function AdminQueueScreen() {
  const { t } = useTranslation()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<WkConfirmState | null>(null)
  const [counts, setCounts] = useState<ApprovalCounts | null>(null)

  const list = usePagedList<User>({
    cacheKeyPrefix: cacheKeys.queue,
    initialFilter: 'pending',
    fetcher: async ({ page, query, filter }) => {
      const r = await listApprovals({
        approval: filter as ApprovalListStatus,
        page,
        limit: PAGE_SIZE,
        q: query || undefined,
      })
      if (r.meta.counts) setCounts(r.meta.counts)
      return r
    },
  })
  const pendingTab = list.filter === 'pending'

  async function run(userId: string, action: 'approve' | 'unapprove' | 'delete') {
    setBusyId(userId)
    try {
      if (action === 'approve') await approveUser(userId)
      else if (action === 'unapprove') await unapproveUser(userId)
      else await deleteApproval(userId)
      invalidateAdminCaches()
      toastSuccess(t('queue.updated'))
      list.reload()
    } catch (err) {
      handleApiError(err, t('queue.updateFailed'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <WkListScreen
        testID="e2e-admin-queue"
        list={list}
        title={t('queue.title')}
        backHref="/admin/more"
        searchPlaceholder={t('queue.search')}
        filters={[
          { value: 'pending', label: t('queue.pending'), count: counts?.pending ?? null },
          { value: 'approved', label: t('queue.approved'), count: counts?.approved ?? null },
        ]}
        emptyIcon={UserCheck}
        emptyTitle={pendingTab ? t('queue.emptyPending') : t('queue.emptyApproved')}
        emptyBody={pendingTab ? t('adminPortal.queueEmptyHint') : undefined}
        renderItem={(user) => {
          const name = userDisplayName(user)
          const busy = busyId === user.id
          return (
            <WkListRow
              media={<WkMedia name={name} round hero />}
              title={userDisplayLabel(user)}
              pill={{ label: enumLabel(t, 'role', user.role), tone: 'teal' }}
              sub={ltr(user.email)}
              subLtr
              sub2={shortDate(user.createdAt)}
              actions={[
                pendingTab
                  ? {
                      key: 'approve',
                      label: t('queue.approve'),
                      icon: Check,
                      variant: 'brand' as const,
                      flex: 1.4,
                      loading: busy,
                      disabled: busyId !== null,
                      onPress: () => void run(user.id, 'approve'),
                    }
                  : {
                      key: 'unapprove',
                      label: t('queue.unapprove'),
                      icon: Undo2,
                      flex: 1.4,
                      loading: busy,
                      disabled: busyId !== null,
                      onPress: () => void run(user.id, 'unapprove'),
                    },
                {
                  key: 'remove',
                  label: t('common.remove'),
                  icon: Trash2,
                  variant: 'dangerSoft' as const,
                  disabled: busyId !== null,
                  onPress: () =>
                    setConfirm({
                      title: t('queue.removeTitle'),
                      body: t('queue.removeBody'),
                      cta: t('common.remove'),
                      onConfirm: () => {
                        setConfirm(null)
                        void run(user.id, 'delete')
                      },
                    }),
                },
              ]}
            />
          )
        }}
      />
      <WkConfirm state={confirm} onCancel={() => setConfirm(null)} />
    </>
  )
}
