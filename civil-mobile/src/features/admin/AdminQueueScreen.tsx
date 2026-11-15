import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { Avatar, ListCard, ListScreen, StandardListRow } from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useResourceList } from '@/hooks/useResourceList'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys, invalidateAdminCaches } from '@/lib/cacheKeys'
import { userDisplayName } from '@/lib/user'
import { showBlockingAlert } from '@/services/feedback'
import { useToastSuccess } from '@/services/toast'
import {
  type ApprovalListStatus,
  approveUser,
  deleteApproval,
  listApprovals,
  unapproveUser,
} from '@/services/users'

const PAGE_SIZE = 20

export function AdminQueueScreen() {
  const { t } = useTranslation()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const [busyId, setBusyId] = useState<string | null>(null)
  const { view, remote, list, listProps } = useResourceList(
    ({ page, query, filter }) =>
      listApprovals({
        approval: filter as ApprovalListStatus,
        page,
        limit: PAGE_SIZE,
        q: query || undefined,
        counts: false,
      }),
    { pageSize: PAGE_SIZE, initialFilter: 'pending', cacheKeyPrefix: cacheKeys.queue },
  )
  const approval = list.filter as ApprovalListStatus
  const filterOptions = useMemo(
    () => [
      { value: 'pending', label: t('queue.pending') },
      { value: 'approved', label: t('queue.approved') },
    ],
    [t],
  )

  async function runAction(userId: string, action: 'approve' | 'unapprove' | 'delete') {
    setBusyId(userId)
    try {
      if (action === 'approve') await approveUser(userId)
      else if (action === 'unapprove') await unapproveUser(userId)
      else await deleteApproval(userId)
      invalidateAdminCaches()
      toastSuccess(t('queue.updated'))
      await remote.refetch()
    } catch (err) {
      handleApiError(err, t('queue.updateFailed'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <ListScreen
      title={t('queue.title')}
      subtitle={view.total ? t('common.total', { count: view.total }) : undefined}
      backHref="/admin/more"
      searchPlaceholder={t('queue.search')}
      filterOptions={filterOptions}
      keyExtractor={(item) => item.id}
      renderItem={(item) => {
        const busy = busyId === item.id
        return (
          <ListCard
            leading={<Avatar name={userDisplayName(item)} imageUrl={item.profile?.avatarUrl} />}
          >
            <StandardListRow
              title={userDisplayName(item)}
              statusLabel={enumLabel(t, 'role', item.role)}
              statusTone="info"
              subtitle={item.email}
              extra={
                <View className="flex-row flex-wrap gap-2 pt-2">
                  {approval === 'pending' ? (
                    <Button
                      size="sm"
                      disabled={busy}
                      onPress={() => void runAction(item.id, 'approve')}
                    >
                      {busy ? <ButtonSpinner /> : null}
                      <ButtonText>{t('queue.approve')}</ButtonText>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onPress={() => void runAction(item.id, 'unapprove')}
                    >
                      {busy ? <ButtonSpinner /> : null}
                      <ButtonText>{t('queue.unapprove')}</ButtonText>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onPress={() =>
                      showBlockingAlert(t('queue.removeTitle'), t('queue.removeBody'), {
                        cancelLabel: t('common.cancel'),
                        confirmLabel: t('common.remove'),
                        onConfirm: () => void runAction(item.id, 'delete'),
                      })
                    }
                  >
                    <ButtonText>{t('common.remove')}</ButtonText>
                  </Button>
                </View>
              }
            />
          </ListCard>
        )
      }}
      loadingLabel={t('queue.loading')}
      emptyTitle={t(approval === 'pending' ? 'queue.emptyPending' : 'queue.emptyApproved')}
      {...listProps}
    />
  )
}
