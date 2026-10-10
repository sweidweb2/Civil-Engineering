import { apiRequest } from './api'

export type ReviewStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'
export type ReviewTargetType = 'PROVIDER' | 'WORKER' | 'LISTING'

export type Review = {
  id: string
  authorId: string
  author: {
    id: string
    email: string
    displayName: string
  }
  targetType: ReviewTargetType
  targetId: string
  targetName: string
  rating: number
  comment: string
  status: ReviewStatus
  createdAt: string
  updatedAt: string
}

export type ReviewStatusCounts = {
  PENDING: number
  ACCEPTED: number
  REJECTED: number
}

export type PaginatedReviews = {
  data: Review[]
  meta: {
    page: number
    limit: number
    total: number
    statusCounts: ReviewStatusCounts
  }
}

export type ReviewTargetOption = {
  id: string
  name: string
  subtitle: string | null
}

export type ReviewWriteInput = {
  authorId?: string
  targetType: ReviewTargetType
  targetId: string
  rating: number
  comment: string
  status?: ReviewStatus
}

export const REVIEW_STATUSES: ReviewStatus[] = ['PENDING', 'ACCEPTED', 'REJECTED']
export const REVIEW_TARGET_TYPES: ReviewTargetType[] = ['PROVIDER', 'WORKER', 'LISTING']

export function isReviewStatus(value: string): value is ReviewStatus {
  return value === 'PENDING' || value === 'ACCEPTED' || value === 'REJECTED'
}

export function isReviewTargetType(value: string): value is ReviewTargetType {
  return value === 'PROVIDER' || value === 'WORKER' || value === 'LISTING'
}

export function reviewStatusLabel(status: ReviewStatus): string {
  if (status === 'PENDING') return 'Pending'
  if (status === 'ACCEPTED') return 'Accepted'
  return 'Rejected'
}

export function listReviews(
  page = 1,
  limit = 8,
  filters?: { q?: string; status?: ReviewStatus; targetType?: ReviewTargetType },
) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (filters?.q) params.set('q', filters.q)
  if (filters?.status) params.set('status', filters.status)
  if (filters?.targetType) params.set('targetType', filters.targetType)
  return apiRequest<PaginatedReviews>(`/reviews?${params.toString()}`)
}

export function listReviewTargets(targetType: ReviewTargetType) {
  const params = new URLSearchParams({ targetType })
  return apiRequest<{ data: ReviewTargetOption[] }>(`/reviews/targets?${params.toString()}`)
}

export function createReview(input: ReviewWriteInput) {
  return apiRequest<{ data: Review }>('/reviews', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateReview(id: string, input: Partial<ReviewWriteInput>) {
  return apiRequest<{ data: Review }>(`/reviews/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteReview(id: string) {
  return apiRequest<void>(`/reviews/${id}`, { method: 'DELETE' })
}
