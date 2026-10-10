import type { ReviewStatus, ReviewTargetType } from './reviews.schema.js'

export type ReviewAuthor = {
  id: string
  email: string
  displayName: string
}

export type Review = {
  id: string
  authorId: string
  author: ReviewAuthor
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
