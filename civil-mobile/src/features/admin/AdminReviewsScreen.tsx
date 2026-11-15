import { useCallback, useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { Star } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { IconTile, ListCard, ListScreen, StatusPill, toneForStatus } from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { listView, useListState } from '@/hooks/useListState'
import { useRemoteData } from '@/hooks/useRemoteData'
import { useThemeColors } from '@/hooks/useThemeColors'
import { enumLabel } from '@/i18n/labels'
import { ApiError } from '@/services/api'
import { showApiAlert, showBlockingAlert } from '@/services/feedback'
import {
  deleteReview,
  listReviews,
  type Review,
  type ReviewStatus,
  updateReview,
} from '@/services/reviews'
import { useToastApiError, useToastSuccess } from '@/services/toast'

const PAGE_SIZE = 20
const STATUSES: ReviewStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN']

function Stars({ rating }: { rating: number }) {
  const colors = useThemeColors()
  return (
    <View className="flex-row items-center gap-0.5" accessibilityLabel={`${rating}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          color={n <= rating ? colors.warning : colors.border}
          fill={n <= rating ? colors.warning : 'transparent'}
        />
      ))}
    </View>
  )
}

export function AdminReviewsScreen() {
  const { t } = useTranslation()
  const toastApiError = useToastApiError()
  const toastSuccess = useToastSuccess()
  const list = useListState('PENDING')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(
    () =>
      listReviews(list.page, PAGE_SIZE, {
        q: list.appliedQuery || undefined,
        status: (list.filter || undefined) as ReviewStatus | undefined,
      }),
    [list.appliedQuery, list.filter, list.page],
  )
  const remote = useRemoteData(load)
  const view = listView(remote, PAGE_SIZE)
  const statusOptions = useMemo(
    () => STATUSES.map((value) => ({ value, label: enumLabel(t, 'reviewStatus', value) })),
    [t],
  )

  async function setReviewStatus(review: Review, next: ReviewStatus) {
    setBusyId(review.id)
    try {
      await updateReview(review.id, { status: next })
      toastSuccess(t('reviews.markedAs', { status: enumLabel(t, 'reviewStatus', next) }))
      await remote.refetch()
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) toastApiError(err)
      else showApiAlert(err, t('reviews.updateFailed'))
    } finally {
      setBusyId(null)
    }
  }

  function onDelete(review: Review) {
    showBlockingAlert(t('reviews.deleteTitle'), t('reviews.deleteBody'), {
      cancelLabel: t('common.cancel'),
      confirmLabel: t('common.delete'),
      onConfirm: () => {
        void (async () => {
          setBusyId(review.id)
          try {
            await deleteReview(review.id)
            toastSuccess(t('reviews.deleted'))
            await remote.refetch()
          } catch (err) {
            if (err instanceof ApiError && err.status >= 500) toastApiError(err)
            else showApiAlert(err, t('reviews.deleteFailed'))
          } finally {
            setBusyId(null)
          }
        })()
      },
    })
  }

  return (
    <ListScreen
      title={t('reviews.title')}
      subtitle={view.total ? t('common.total', { count: view.total }) : undefined}
      backHref="/admin/more"
      searchPlaceholder={t('reviews.search')}
      query={list.query}
      onQueryChange={list.setQuery}
      onSearch={list.onSearch}
      filterOptions={statusOptions}
      filterValue={list.filter}
      onFilterChange={list.onFilter}
      allLabel={t('common.all')}
      data={view.rows}
      keyExtractor={(item) => item.id}
      renderItem={(item) => {
        const busy = busyId === item.id
        return (
          <ListCard leading={<IconTile icon={Star} tone="warning" />}>
            <View className="flex-row items-start justify-between gap-2">
              <Text
                className="min-w-0 flex-1 text-base font-bold text-foreground"
                numberOfLines={1}
              >
                {item.targetName || item.targetType}
              </Text>
              <StatusPill
                label={enumLabel(t, 'reviewStatus', item.status)}
                tone={toneForStatus(item.status)}
              />
            </View>
            <Stars rating={item.rating} />
            <Text className="text-sm text-foreground" numberOfLines={3}>
              {item.comment?.trim() || t('reviews.noComment')}
            </Text>
            <View className="flex-row flex-wrap gap-2 pt-2">
              {item.status !== 'APPROVED' ? (
                <Button
                  size="sm"
                  disabled={busy}
                  onPress={() => void setReviewStatus(item, 'APPROVED')}
                >
                  {busy ? <ButtonSpinner /> : null}
                  <ButtonText>{t('reviews.approve')}</ButtonText>
                </Button>
              ) : null}
              {item.status !== 'REJECTED' ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onPress={() => void setReviewStatus(item, 'REJECTED')}
                >
                  <ButtonText>{t('reviews.reject')}</ButtonText>
                </Button>
              ) : null}
              {item.status !== 'HIDDEN' ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onPress={() => void setReviewStatus(item, 'HIDDEN')}
                >
                  <ButtonText>{t('reviews.hide')}</ButtonText>
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onPress={() => onDelete(item)}
              >
                <ButtonText>{t('common.delete')}</ButtonText>
              </Button>
            </View>
          </ListCard>
        )
      }}
      isInitialLoading={view.isInitialLoading}
      isRefreshing={view.isRefreshing}
      error={view.error}
      onRefresh={() => void remote.refetch()}
      loadingLabel={t('reviews.loading')}
      page={list.page}
      totalPages={view.totalPages}
      onPageChange={list.setPage}
      emptyTitle={t('reviews.empty')}
    />
  )
}
