import { useCallback, useState } from 'react'
import { Check, MessageSquareText, Trash2, X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

import { WkConfirm, type WkConfirmState } from '@/components/wk/kit'
import { usePagedList, WkListRow, WkListScreen, type WkRowAction } from '@/components/wk/list'
import { REVIEW_TONE, shortDate } from '@/features/admin/ui'
import { useHandleApiError } from '@/hooks/useHandleApiError'
import { useLatestCallback } from '@/hooks/useLatestCallback'
import { enumLabel } from '@/i18n/labels'
import { cacheKeys, invalidateAdminCaches } from '@/lib/cacheKeys'
import {
  deleteReview,
  listReviews,
  type Review,
  type ReviewStatus,
  type ReviewStatusCounts,
  updateReview,
} from '@/services/reviews'
import { useToastSuccess } from '@/services/toast'

const PAGE_SIZE = 20
const STATUSES: ReviewStatus[] = ['PENDING', 'ACCEPTED', 'REJECTED']

/** Admin → Reviews: stars, comment, approve / reject / delete. */
export function AdminReviewsScreen() {
  const { t } = useTranslation()
  const handleApiError = useHandleApiError()
  const toastSuccess = useToastSuccess()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<WkConfirmState | null>(null)
  const [counts, setCounts] = useState<ReviewStatusCounts | null>(null)

  const list = usePagedList<Review>({
    cacheKeyPrefix: cacheKeys.reviews,
    initialFilter: 'PENDING',
    fetcher: async ({ page, query, filter }) => {
      const r = await listReviews(page, PAGE_SIZE, {
        q: query || undefined,
        status: (filter || undefined) as ReviewStatus | undefined,
      })
      if (r.meta.statusCounts) setCounts(r.meta.statusCounts)
      return r
    },
  })

  async function setStatus(review: Review, next: ReviewStatus) {
    setBusyId(review.id)
    try {
      await updateReview(review.id, { status: next })
      invalidateAdminCaches()
      toastSuccess(t('reviews.markedAs', { status: enumLabel(t, 'reviewStatus', next) }))
      list.reload()
    } catch (err) {
      handleApiError(err, t('reviews.updateFailed'))
    } finally {
      setBusyId(null)
    }
  }

  function askDelete(review: Review) {
    setConfirm({
      title: t('reviews.deleteTitle'),
      body: t('reviews.deleteBody'),
      cta: t('common.delete'),
      onConfirm: () => {
        setConfirm(null)
        void (async () => {
          setBusyId(review.id)
          try {
            await deleteReview(review.id)
            invalidateAdminCaches()
            toastSuccess(t('reviews.deleted'))
            list.reload()
          } catch (err) {
            handleApiError(err, t('reviews.deleteFailed'))
          } finally {
            setBusyId(null)
          }
        })()
      },
    })
  }

  const all = counts ? counts.PENDING + counts.ACCEPTED + counts.REJECTED : null
  // Stable handles so search keystrokes do not re-render every row.
  const setStatusLatest = useLatestCallback(setStatus)
  const askDeleteLatest = useLatestCallback(askDelete)
  const renderRow = useCallback(
    (review: Review) => {
      const busy = busyId === review.id
      const actions: WkRowAction[] = []
      if (review.status !== 'ACCEPTED') {
        actions.push({
          key: 'approve',
          label: t('reviews.approve'),
          icon: Check,
          variant: 'brand',
          flex: 1.3,
          loading: busy,
          disabled: busyId !== null,
          onPress: () => void setStatusLatest(review, 'ACCEPTED'),
        })
      }
      if (review.status !== 'REJECTED') {
        actions.push({
          key: 'reject',
          label: t('reviews.reject'),
          icon: X,
          disabled: busyId !== null,
          onPress: () => void setStatusLatest(review, 'REJECTED'),
        })
      }
      actions.push({
        key: 'delete',
        label: t('common.delete'),
        icon: Trash2,
        variant: 'dangerSoft',
        disabled: busyId !== null,
        onPress: () => askDeleteLatest(review),
      })
      return (
        <WkListRow
          title={review.targetName || enumLabel(t, 'reviewTarget', review.targetType)}
          pill={{
            label: enumLabel(t, 'reviewStatus', review.status),
            tone: REVIEW_TONE[review.status],
          }}
          sub2={[enumLabel(t, 'reviewTarget', review.targetType), shortDate(review.createdAt)]
            .filter(Boolean)
            .join(' · ')}
          rating={review.rating}
          body={review.comment?.trim() || t('reviews.noComment')}
          actions={actions}
        />
      )
    },
    [askDeleteLatest, busyId, setStatusLatest, t],
  )

  return (
    <>
      <WkListScreen
        testID="e2e-admin-reviews"
        list={list}
        title={t('reviews.title')}
        backHref="/admin/more"
        searchPlaceholder={t('reviews.search')}
        filters={[
          ...STATUSES.map((s) => ({
            value: s,
            label: enumLabel(t, 'reviewStatus', s),
            count: counts?.[s] ?? null,
          })),
          { value: '', label: t('providerPortal.all'), count: all },
        ]}
        emptyIcon={MessageSquareText}
        emptyTitle={t('reviews.empty')}
        renderItem={renderRow}
      />
      <WkConfirm state={confirm} onCancel={() => setConfirm(null)} />
    </>
  )
}
