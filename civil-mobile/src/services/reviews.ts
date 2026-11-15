import { apiRequest } from './api'

export type ReviewStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'APPROVED' | 'HIDDEN'
export type ReviewTargetType = 'PROVIDER' | 'LISTING' | 'WORKER'

export type Review = {
  id: string
  targetType: ReviewTargetType
  targetId: string
  targetName?: string | null
  rating: number
  comment: string | null
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
    statusCounts?: ReviewStatusCounts
  }
}

export function reviewStatusLabel(status: ReviewStatus): string {
  if (status === 'PENDING') return 'Pending'
  if (status === 'ACCEPTED' || status === 'APPROVED') return 'Approved'
  if (status === 'REJECTED') return 'Rejected'
  return 'Hidden'
}

export function listReviews(
  page = 1,
  limit = 20,
  filters?: { status?: ReviewStatus; targetType?: ReviewTargetType; q?: string },
) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (filters?.status) params.set('status', filters.status)
  if (filters?.targetType) params.set('targetType', filters.targetType)
  if (filters?.q) params.set('q', filters.q)
  return apiRequest<PaginatedReviews>(`/reviews?${params.toString()}`)
}

export function updateReview(
  id: string,
  input: { status?: ReviewStatus; comment?: string | null },
) {
  return apiRequest<{ data: Review }>(`/reviews/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteReview(id: string) {
  return apiRequest<void>(`/reviews/${id}`, { method: 'DELETE' })
}
