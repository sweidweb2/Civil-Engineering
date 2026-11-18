import { useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { Star } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { IconTile, ListCard, ListScreen, StandardListRow, toneForStatus } from '@/components/kit'
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useResourceList } from '@/hooks/useResourceList'
import { useThemeColors } from '@/hooks/useThemeColors'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys, invalidateAdminCaches } from '@/lib/cacheKeys'
import { showBlockingAlert } from '@/services/feedback'
import {
  deleteReview,
  listReviews,
  type Review,
  type ReviewStatus,
  updateReview,
} from '@/services/reviews'
import { useToastSuccess } from '@/services/toast'

const PAGE_SIZE = 20
const STATUSES: ReviewStatus[] = ['PENDING', 'ACCEPTED', 'REJECTED']

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
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const [busyId, setBusyId] = useState<string | null>(null)
  const { remote, listProps } = useResourceList(
    ({ page, query, filter }) =>
      listReviews(page, PAGE_SIZE, {
        q: query || undefined,
        status: (filter || undefined) as ReviewStatus | undefined,
        counts: false,
      }),
    { pageSize: PAGE_SIZE, initialFilter: 'PENDING', cacheKeyPrefix: cacheKeys.reviews },
  )
  const statusOptions = useMemo(
    () => STATUSES.map((value) => ({ value, label: enumLabel(t, 'reviewStatus', value) })),
    [t],
  )

  async function setReviewStatus(review: Review, next: ReviewStatus) {
    setBusyId(review.id)
    try {
      await updateReview(review.id, { status: next })
      invalidateAdminCaches()
      toastSuccess(t('reviews.markedAs', { status: enumLabel(t, 'reviewStatus', next) }))
      await remote.refetch()
    } catch (err) {
      handleApiError(err, t('reviews.updateFailed'))
    } finally {
      setBusyId(null)
    }
  }

  function onDelete(review: Review) {
    showBlockingAlert(t('reviews.deleteTitle'), t('reviews.deleteBody'), {
      destructive: true,
      cancelLabel: t('common.cancel'),
      confirmLabel: t('common.delete'),
      onConfirm: () => {
        void (async () => {
          setBusyId(review.id)
          try {
            await deleteReview(review.id)
            invalidateAdminCaches()
            toastSuccess(t('reviews.deleted'))
            await remote.refetch()
          } catch (err) {
            handleApiError(err, t('reviews.deleteFailed'))
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
      backHref="/admin/more"
      searchPlaceholder={t('reviews.search')}
      filterOptions={statusOptions}
      allLabel={t('common.all')}
      keyExtractor={(item) => item.id}
      renderItem={(item) => {
        const busy = busyId === item.id
        return (
          <ListCard leading={<IconTile icon={Star} tone="warning" />}>
            <StandardListRow
              title={item.targetName || item.targetType}
              statusLabel={enumLabel(t, 'reviewStatus', item.status)}
              statusTone={toneForStatus(item.status)}
              extra={
                <>
                  <Stars rating={item.rating} />
                  <Text className="text-sm text-foreground" numberOfLines={3}>
                    {item.comment?.trim() || t('reviews.noComment')}
                  </Text>
                  <View className="flex-row flex-wrap gap-2 pt-2">
                    {item.status !== 'ACCEPTED' ? (
                      <Button
                        size="sm"
                        disabled={busy}
                        onPress={() => void setReviewStatus(item, 'ACCEPTED')}
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
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onPress={() => onDelete(item)}
                    >
                      <ButtonText>{t('common.delete')}</ButtonText>
                    </Button>
                  </View>
                </>
              }
            />
          </ListCard>
        )
      }}
      loadingLabel={t('reviews.loading')}
      emptyTitle={t('reviews.empty')}
      {...listProps}
    />
  )
}
