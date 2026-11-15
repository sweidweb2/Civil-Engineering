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
  deleteReview,
  listReviews,
  type Review,
  type ReviewStatus,
  reviewStatusLabel,
  updateReview,
} from '@/services/reviews'
import { useToastApiError } from '@/services/toast'

const PAGE_SIZE = 20

const STATUS_OPTIONS: Array<{ value: ReviewStatus; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'HIDDEN', label: 'Hidden' },
]

export function AdminReviewsScreen() {
  const toastApiError = useToastApiError()
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [status, setStatus] = useState<ReviewStatus | ''>('PENDING')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(
    () =>
      listReviews(page, PAGE_SIZE, {
        q: appliedQuery || undefined,
        status: status || undefined,
      }),
    [appliedQuery, page, status],
  )
  const remote = useRemoteData(load)

  const hasData = remote.status === 'success'
  const rows = hasData ? remote.data.data : []
  const total = hasData ? remote.data.meta.total : 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const isInitialLoading = remote.isLoading && !hasData
  const isRefreshing = hasData && remote.isLoading

  function onSearch() {
    setPage(1)
    setAppliedQuery(query.trim())
  }

  async function setReviewStatus(review: Review, next: ReviewStatus) {
    setBusyId(review.id)
    try {
      await updateReview(review.id, { status: next })
      showBlockingAlert('Updated', `Review marked ${reviewStatusLabel(next).toLowerCase()}.`)
      await remote.refetch()
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) toastApiError(err)
      else showApiAlert(err, 'Could not update review')
    } finally {
      setBusyId(null)
    }
  }

  function onDelete(review: Review) {
    showBlockingAlert('Delete review?', 'This permanently removes the review.', {
      cancelLabel: 'Cancel',
      confirmLabel: 'Delete',
      onConfirm: () => {
        void (async () => {
          setBusyId(review.id)
          try {
            await deleteReview(review.id)
            showBlockingAlert('Deleted', 'Review was removed.')
            await remote.refetch()
          } catch (err) {
            if (err instanceof ApiError && err.status >= 500) toastApiError(err)
            else showApiAlert(err, 'Could not delete review')
          } finally {
            setBusyId(null)
          }
        })()
      },
    })
  }

  return (
    <View className="flex-1 bg-background">
      <Header title="Reviews" subtitle={total ? `${total} total` : undefined} />

      <View className="gap-3 border-b border-border px-4 py-3">
        <View className="flex-row gap-2">
          <View className="min-w-0 flex-1">
            <Input>
              <InputField
                placeholder="Search reviews"
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
          options={STATUS_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          value={status}
          allowClear
          onChange={(value) => {
            setStatus(value as ReviewStatus | '')
            setPage(1)
          }}
        />
      </View>

      <AsyncState
        isLoading={isInitialLoading}
        error={remote.status === 'error' ? remote.error : undefined}
        onRetry={() => void remote.refetch()}
        loadingLabel="Loading reviews…"
      >
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => void remote.refetch()} />
          }
          ListEmptyComponent={
            <View className="items-center px-6 py-16">
              <Text className="text-center text-base text-muted-foreground">No reviews found.</Text>
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
                    {item.targetName || item.targetType}
                  </Text>
                  <Badge variant={item.status === 'APPROVED' ? 'default' : 'secondary'}>
                    <BadgeText>{reviewStatusLabel(item.status)}</BadgeText>
                  </Badge>
                </View>
                <Text className="text-sm text-muted-foreground">
                  {item.rating}/5 · {item.targetType}
                </Text>
                <Text className="text-sm text-foreground" numberOfLines={3}>
                  {item.comment?.trim() || 'No comment'}
                </Text>
                <View className="flex-row flex-wrap gap-2 pt-1">
                  {item.status !== 'APPROVED' ? (
                    <Button
                      size="sm"
                      disabled={busy}
                      onPress={() => void setReviewStatus(item, 'APPROVED')}
                    >
                      {busy ? <ButtonSpinner /> : null}
                      <ButtonText>Approve</ButtonText>
                    </Button>
                  ) : null}
                  {item.status !== 'REJECTED' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onPress={() => void setReviewStatus(item, 'REJECTED')}
                    >
                      <ButtonText>Reject</ButtonText>
                    </Button>
                  ) : null}
                  {item.status !== 'HIDDEN' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onPress={() => void setReviewStatus(item, 'HIDDEN')}
                    >
                      <ButtonText>Hide</ButtonText>
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onPress={() => onDelete(item)}
                  >
                    <ButtonText>Delete</ButtonText>
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
