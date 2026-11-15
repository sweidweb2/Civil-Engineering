import { useCallback, useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { Avatar, ListCard, ListScreen, StatusPill } from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { listView, useListState } from '@/hooks/useListState'
import { useRemoteData } from '@/hooks/useRemoteData'
import { enumLabel } from '@/i18n/labels'
import { userDisplayName } from '@/lib/user'
import { ApiError } from '@/services/api'
import { showApiAlert, showBlockingAlert } from '@/services/feedback'
import { useToastApiError, useToastSuccess } from '@/services/toast'
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
  const toastApiError = useToastApiError()
  const toastSuccess = useToastSuccess()
  const list = useListState('pending')
  const [busyId, setBusyId] = useState<string | null>(null)
  const approval = list.filter as ApprovalListStatus

  const load = useCallback(
    () =>
      listApprovals({
        approval,
        page: list.page,
        limit: PAGE_SIZE,
        q: list.appliedQuery || undefined,
      }),
    [approval, list.appliedQuery, list.page],
  )
  const remote = useRemoteData(load)
  const view = listView(remote, PAGE_SIZE)
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
      toastSuccess(t('queue.updated'))
      await remote.refetch()
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) toastApiError(err)
      else showApiAlert(err, t('queue.updateFailed'))
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
      query={list.query}
      onQueryChange={list.setQuery}
      onSearch={list.onSearch}
      filterOptions={filterOptions}
      filterValue={list.filter}
      onFilterChange={list.onFilter}
      data={view.rows}
      keyExtractor={(item) => item.id}
      renderItem={(item) => {
        const busy = busyId === item.id
        return (
          <ListCard
            leading={<Avatar name={userDisplayName(item)} imageUrl={item.profile?.avatarUrl} />}
          >
            <View className="flex-row items-start justify-between gap-2">
              <Text
                className="min-w-0 flex-1 text-base font-bold text-foreground"
                numberOfLines={1}
              >
                {userDisplayName(item)}
              </Text>
              <StatusPill label={enumLabel(t, 'role', item.role)} tone="info" />
            </View>
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {item.email}
            </Text>
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
          </ListCard>
        )
      }}
      isInitialLoading={view.isInitialLoading}
      isRefreshing={view.isRefreshing}
      error={view.error}
      onRefresh={() => void remote.refetch()}
      loadingLabel={t('queue.loading')}
      page={list.page}
      totalPages={view.totalPages}
      onPageChange={list.setPage}
      emptyTitle={t(approval === 'pending' ? 'queue.emptyPending' : 'queue.emptyApproved')}
    />
  )
}
