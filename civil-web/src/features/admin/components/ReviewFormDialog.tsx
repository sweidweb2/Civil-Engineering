import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/services/api'
import {
  createReview,
  isReviewStatus,
  isReviewTargetType,
  listReviewTargets,
  type Review,
  REVIEW_STATUSES,
  REVIEW_TARGET_TYPES,
  type ReviewStatus,
  type ReviewTargetOption,
  type ReviewTargetType,
  updateReview,
} from '@/services/reviews'
import { listUsers, type User } from '@/services/users'

type ReviewFormValues = {
  authorId: string
  targetType: ReviewTargetType | ''
  targetId: string
  rating: string
  comment: string
  status: ReviewStatus
}

const EMPTY_FORM: ReviewFormValues = {
  authorId: '',
  targetType: '',
  targetId: '',
  rating: '5',
  comment: '',
  status: 'PENDING',
}

function formFromReview(review: Review): ReviewFormValues {
  return {
    authorId: review.authorId,
    targetType: review.targetType,
    targetId: review.targetId,
    rating: String(review.rating),
    comment: review.comment,
    status: review.status,
  }
}

function authorLabel(user: User): string {
  const profile = user.profile
  const name =
    profile?.displayName || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ')
  return name ? `${name} · ${user.email}` : user.email
}

function targetLabel(option: ReviewTargetOption): string {
  return option.subtitle ? `${option.name} · ${option.subtitle}` : option.name
}

type ReviewFormDialogProps = {
  open: boolean
  mode: 'create' | 'edit'
  review?: Review | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function ReviewFormDialog({
  open,
  mode,
  review,
  onOpenChange,
  onSaved,
}: ReviewFormDialogProps) {
  const { t } = useTranslation(['admin', 'common'])
  const [form, setForm] = useState<ReviewFormValues>(EMPTY_FORM)
  const [authors, setAuthors] = useState<User[]>([])
  const [targets, setTargets] = useState<ReviewTargetOption[]>([])
  const [isLoadingAuthors, setIsLoadingAuthors] = useState(false)
  const [isLoadingTargets, setIsLoadingTargets] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(review ? formFromReview(review) : EMPTY_FORM)
  }, [open, review])

  useEffect(() => {
    if (!open || mode !== 'create') return
    let cancelled = false
    setIsLoadingAuthors(true)
    void listUsers(1, 100)
      .then((result) => {
        if (!cancelled) setAuthors(result.data.filter((user) => user.status === 'ACTIVE'))
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error instanceof ApiError ? error.message : t('admin:reviews.form.couldNotLoadAuthors'),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAuthors(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode, open, t])

  useEffect(() => {
    if (!open || !form.targetType) {
      setTargets([])
      return
    }
    const targetType = form.targetType
    let cancelled = false
    setIsLoadingTargets(true)
    void listReviewTargets(targetType)
      .then((result) => {
        if (!cancelled) setTargets(result.data)
      })
      .catch((error) => {
        if (!cancelled) {
          setTargets([])
          toast.error(
            error instanceof ApiError ? error.message : t('admin:reviews.form.couldNotLoadTargets'),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTargets(false)
      })
    return () => {
      cancelled = true
    }
  }, [form.targetType, open, t])

  const targetOptions = useMemo(() => {
    if (!review || review.targetType !== form.targetType) return targets
    if (targets.some((option) => option.id === review.targetId)) return targets
    return [{ id: review.targetId, name: review.targetName, subtitle: null }, ...targets]
  }, [form.targetType, review, targets])

  async function submit() {
    if (mode === 'create' && !form.authorId) {
      toast.error(t('admin:reviews.form.chooseAuthor'))
      return
    }
    if (!isReviewTargetType(form.targetType)) {
      toast.error(t('admin:reviews.form.chooseTargetType'))
      return
    }
    if (!form.targetId) {
      toast.error(t('admin:reviews.form.chooseTarget'))
      return
    }
    const rating = Number(form.rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      toast.error(t('admin:reviews.form.ratingRange'))
      return
    }
    const comment = form.comment.trim()
    if (!comment) {
      toast.error(t('admin:reviews.form.commentRequired'))
      return
    }

    setIsSaving(true)
    try {
      if (mode === 'create') {
        await createReview({
          authorId: form.authorId,
          targetType: form.targetType,
          targetId: form.targetId,
          rating,
          comment,
          status: form.status,
        })
      } else if (review) {
        await updateReview(review.id, {
          targetType: form.targetType,
          targetId: form.targetId,
          rating,
          comment,
          status: form.status,
        })
      }
      onSaved()
      onOpenChange(false)
      toast.message(
        mode === 'create' ? t('admin:reviews.form.created') : t('admin:reviews.updated'),
      )
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('admin:reviews.form.couldNotSave'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? t('admin:reviews.form.createTitle')
              : t('admin:reviews.form.editTitle')}
          </DialogTitle>
          <DialogDescription>{t('admin:reviews.form.dialogDescription')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {mode === 'create' ? (
            <div className="grid gap-1.5">
              <Label htmlFor="review-author">{t('admin:reviews.headers.author')}</Label>
              <Select
                items={authors.map((user) => ({ value: user.id, label: authorLabel(user) }))}
                value={form.authorId || null}
                onValueChange={(value) => {
                  if (value) setForm((current) => ({ ...current, authorId: value }))
                }}
              >
                <SelectTrigger id="review-author" className="w-full">
                  <SelectValue
                    placeholder={
                      isLoadingAuthors
                        ? t('admin:reviews.form.loadingAuthors')
                        : t('admin:reviews.form.selectAuthor')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {authors.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {authorLabel(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="review-author-name">{t('admin:reviews.headers.author')}</Label>
              <Input id="review-author-name" value={review?.author.displayName ?? ''} disabled />
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="review-target-type">{t('admin:reviews.form.targetType')}</Label>
              <Select
                items={REVIEW_TARGET_TYPES.map((type) => ({
                  value: type,
                  label: t(`admin:reviews.form.${type}`),
                }))}
                value={form.targetType || null}
                onValueChange={(value) => {
                  if (value && isReviewTargetType(value)) {
                    setForm((current) => ({
                      ...current,
                      targetType: value,
                      targetId: current.targetType === value ? current.targetId : '',
                    }))
                  }
                }}
              >
                <SelectTrigger id="review-target-type" className="w-full">
                  <SelectValue placeholder={t('admin:reviews.form.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_TARGET_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`admin:reviews.form.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="review-target">{t('admin:reviews.headers.target')}</Label>
              <Select
                items={targetOptions.map((option) => ({
                  value: option.id,
                  label: targetLabel(option),
                }))}
                value={form.targetId || null}
                onValueChange={(value) => {
                  if (value) setForm((current) => ({ ...current, targetId: value }))
                }}
              >
                <SelectTrigger
                  id="review-target"
                  className="w-full"
                  disabled={!form.targetType || isLoadingTargets}
                >
                  <SelectValue
                    placeholder={
                      !form.targetType
                        ? t('admin:reviews.form.selectTypeFirst')
                        : isLoadingTargets
                          ? t('common:loading')
                          : t('admin:reviews.form.selectTarget')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {targetOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {targetLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="review-rating">{t('admin:reviews.headers.rating')}</Label>
              <Select
                items={['1', '2', '3', '4', '5'].map((value) => ({ value, label: `${value}/5` }))}
                value={form.rating}
                onValueChange={(value) => {
                  if (value) setForm((current) => ({ ...current, rating: value }))
                }}
              >
                <SelectTrigger id="review-rating" className="w-full">
                  <SelectValue placeholder={t('admin:reviews.form.rating')} />
                </SelectTrigger>
                <SelectContent>
                  {['1', '2', '3', '4', '5'].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}/5
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="review-status">{t('common:status')}</Label>
              <Select
                items={REVIEW_STATUSES.map((status) => ({
                  value: status,
                  label: t(`admin:reviewStatus.${status}`),
                }))}
                value={form.status}
                onValueChange={(value) => {
                  if (value && isReviewStatus(value))
                    setForm((current) => ({ ...current, status: value }))
                }}
              >
                <SelectTrigger id="review-status" className="w-full">
                  <SelectValue placeholder={t('common:status')} />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(`admin:reviewStatus.${status}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="review-comment">{t('common:comment')}</Label>
            <Textarea
              id="review-comment"
              maxLength={2000}
              rows={4}
              placeholder={t('admin:reviews.form.commentPlaceholder')}
              value={form.comment}
              onChange={(event) =>
                setForm((current) => ({ ...current, comment: event.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t('common:cancel')}
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={isSaving}>
            {isSaving
              ? t('common:saving')
              : mode === 'create'
                ? t('common:create')
                : t('common:save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
