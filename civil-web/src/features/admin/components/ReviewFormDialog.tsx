import { useEffect, useMemo, useState } from 'react'
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
  reviewStatusLabel,
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

function targetTypeLabel(type: ReviewTargetType): string {
  return type.charAt(0) + type.slice(1).toLowerCase()
}

type ReviewFormDialogProps = {
  open: boolean
  mode: 'create' | 'edit'
  review?: Review | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function ReviewFormDialog({ open, mode, review, onOpenChange, onSaved }: ReviewFormDialogProps) {
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
        if (!cancelled) toast.error(error instanceof ApiError ? error.message : 'Could not load authors')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAuthors(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode, open])

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
          toast.error(error instanceof ApiError ? error.message : 'Could not load targets')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTargets(false)
      })
    return () => {
      cancelled = true
    }
  }, [form.targetType, open])

  const targetOptions = useMemo(() => {
    if (!review || review.targetType !== form.targetType) return targets
    if (targets.some((option) => option.id === review.targetId)) return targets
    return [{ id: review.targetId, name: review.targetName, subtitle: null }, ...targets]
  }, [form.targetType, review, targets])

  async function submit() {
    if (mode === 'create' && !form.authorId) {
      toast.error('Choose an author')
      return
    }
    if (!isReviewTargetType(form.targetType)) {
      toast.error('Choose a target type')
      return
    }
    if (!form.targetId) {
      toast.error('Choose a target')
      return
    }
    const rating = Number(form.rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      toast.error('Rating must be from 1 to 5')
      return
    }
    const comment = form.comment.trim()
    if (!comment) {
      toast.error('Comment is required')
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
      toast.message(mode === 'create' ? 'Review created' : 'Review updated')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not save review')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create review' : 'Edit review'}</DialogTitle>
          <DialogDescription>
            One review per author and target. Accept publishes it. Reject hides it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {mode === 'create' ? (
            <div className="grid gap-1.5">
              <Label htmlFor="review-author">Author</Label>
              <Select
                items={authors.map((user) => ({ value: user.id, label: authorLabel(user) }))}
                value={form.authorId || null}
                onValueChange={(value) => {
                  if (value) setForm((current) => ({ ...current, authorId: value }))
                }}
              >
                <SelectTrigger id="review-author" className="w-full">
                  <SelectValue placeholder={isLoadingAuthors ? 'Loading authors…' : 'Select an author'} />
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
              <Label htmlFor="review-author-name">Author</Label>
              <Input id="review-author-name" value={review?.author.displayName ?? ''} disabled />
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="review-target-type">Target type</Label>
              <Select
                items={REVIEW_TARGET_TYPES.map((type) => ({ value: type, label: targetTypeLabel(type) }))}
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
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_TARGET_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {targetTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="review-target">Target</Label>
              <Select
                items={targetOptions.map((option) => ({ value: option.id, label: targetLabel(option) }))}
                value={form.targetId || null}
                onValueChange={(value) => {
                  if (value) setForm((current) => ({ ...current, targetId: value }))
                }}
              >
                <SelectTrigger id="review-target" className="w-full" disabled={!form.targetType || isLoadingTargets}>
                  <SelectValue
                    placeholder={
                      !form.targetType ? 'Select a type first' : isLoadingTargets ? 'Loading…' : 'Select a target'
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
              <Label htmlFor="review-rating">Rating</Label>
              <Select
                items={['1', '2', '3', '4', '5'].map((value) => ({ value, label: `${value}/5` }))}
                value={form.rating}
                onValueChange={(value) => {
                  if (value) setForm((current) => ({ ...current, rating: value }))
                }}
              >
                <SelectTrigger id="review-rating" className="w-full">
                  <SelectValue placeholder="Rating" />
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
              <Label htmlFor="review-status">Status</Label>
              <Select
                items={REVIEW_STATUSES.map((status) => ({ value: status, label: reviewStatusLabel(status) }))}
                value={form.status}
                onValueChange={(value) => {
                  if (value && isReviewStatus(value)) setForm((current) => ({ ...current, status: value }))
                }}
              >
                <SelectTrigger id="review-status" className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {reviewStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="review-comment">Comment</Label>
            <Textarea
              id="review-comment"
              maxLength={2000}
              rows={4}
              placeholder="What should other users know?"
              value={form.comment}
              onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={isSaving}>
            {isSaving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
