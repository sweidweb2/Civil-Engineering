import { useCallback, useState } from 'react'
import { FlatList, RefreshControl, Text, View } from 'react-native'

import { AsyncState } from '@/components/feedback/AsyncState'
import { OptionChips } from '@/components/forms/OptionChips'
import { Header } from '@/components/layout/Header'
import { Badge, BadgeText } from '@/components/ui/badge'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { Input, InputField } from '@/components/ui/input'
import { useRemoteData } from '@/hooks/useRemoteData'
import { ApiError } from '@/services/api'
import { showApiAlert, showBlockingAlert } from '@/services/feedback'
import {
  type ApprovalListStatus,
  approveUser,
  deleteApproval,
  listApprovals,
  unapproveUser,
  type User,
} from '@/services/users'
import { useToastApiError } from '@/services/toast'

const PAGE_SIZE = 20

const APPROVAL_OPTIONS: Array<{ value: ApprovalListStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
]

function displayName(user: User): string {
  return (
    user.profile?.displayName ||
    [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') ||
    user.email
  )
}

export function AdminQueueScreen() {
  const toastApiError = useToastApiError()
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [approval, setApproval] = useState<ApprovalListStatus>('pending')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(
    () =>
      listApprovals({
        approval,
        page,
        limit: PAGE_SIZE,
        q: appliedQuery || undefined,
      }),
    [appliedQuery, approval, page],
  )
  const remote = useRemoteData(load)

  const hasData = remote.status === 'success'
  const rows = hasData ? remote.data.data : []
  const total = hasData ? remote.data.meta.total : 0
  const totalPages = Math.max(1, hasData ? remote.data.meta.totalPages : 1)
  const isInitialLoading = remote.isLoading && !hasData
  const isRefreshing = hasData && remote.isLoading

  function onSearch() {
    setPage(1)
    setAppliedQuery(query.trim())
  }

  async function runAction(userId: string, action: 'approve' | 'unapprove' | 'delete') {
    setBusyId(userId)
    try {
      if (action === 'approve') await approveUser(userId)
      else if (action === 'unapprove') await unapproveUser(userId)
      else await deleteApproval(userId)
      showBlockingAlert(
        action === 'approve' ? 'Approved' : action === 'unapprove' ? 'Unapproved' : 'Removed',
        'Queue updated.',
      )
      await remote.refetch()
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) toastApiError(err)
      else showApiAlert(err, 'Could not update request')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <View className="flex-1 bg-background">
      <Header title="Workers requests" subtitle={total ? `${total} total` : undefined} />

      <View className="gap-3 border-b border-border px-4 py-3">
        <View className="flex-row gap-2">
          <View className="min-w-0 flex-1">
            <Input>
              <InputField
                placeholder="Search requests"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={onSearch}
                returnKeyType="search"
              />
            </Input>
          </View>
          <Button size="sm" variant="outline" onPress={onSearch}>
            <ButtonText>Search</ButtonText>
          </Button>
        </View>
        <OptionChips
          options={APPROVAL_OPTIONS}
          value={approval}
          onChange={(value) => {
            setApproval(value as ApprovalListStatus)
            setPage(1)
          }}
        />
      </View>

      <AsyncState
        isLoading={isInitialLoading}
        error={remote.status === 'error' ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingLabel="Loading requests…"
      >
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => void remote.refetch()} />
          }
          ListEmptyComponent={
            <View className="items-center px-6 py-16">
              <Text className="text-center text-base text-muted-foreground">
                No {approval} requests.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const busy = busyId === item.id
            return (
              <View className="gap-2 border-b border-border px-4 py-3">
                <View className="flex-row items-start justify-between gap-2">
                  <Text
                    className="min-w-0 flex-1 text-base font-medium text-foreground"
                    numberOfLines={1}
                  >
                    {displayName(item)}
                  </Text>
                  <Badge variant="secondary">
                    <BadgeText>{item.role}</BadgeText>
                  </Badge>
                </View>
                <Text className="text-sm text-muted-foreground">{item.email}</Text>
                <View className="flex-row flex-wrap gap-2 pt-1">
                  {approval === 'pending' ? (
                    <Button
                      size="sm"
                      disabled={busy}
                      onPress={() => void runAction(item.id, 'approve')}
                    >
                      {busy ? <ButtonSpinner /> : null}
                      <ButtonText>Approve</ButtonText>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onPress={() => void runAction(item.id, 'unapprove')}
                    >
                      {busy ? <ButtonSpinner /> : null}
                      <ButtonText>Unapprove</ButtonText>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onPress={() => {
                      showBlockingAlert('Remove request?', 'This removes the approval request.', {
                        cancelLabel: 'Cancel',
                        confirmLabel: 'Remove',
                        onConfirm: () => void runAction(item.id, 'delete'),
                      })
                    }}
                  >
                    <ButtonText>Remove</ButtonText>
                  </Button>
                </View>
              </View>
            )
          }}
          ListFooterComponent={
            totalPages > 1 ? (
              <View className="flex-row items-center justify-between gap-3 px-4 py-4">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ButtonText>Previous</ButtonText>
                </Button>
                <Text className="text-sm text-muted-foreground">
                  Page {page} / {totalPages}
                </Text>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ButtonText>Next</ButtonText>
                </Button>
              </View>
            ) : null
          }
        />
      </AsyncState>
    </View>
  )
}
