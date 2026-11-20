import type { AuthActor } from '../../authz/index.js'
import { isAdmin } from '../../authz/index.js'
import {
  conflict,
  forbidden,
  isUniqueConflictError,
  notFound,
  validationError,
} from '../../errors/app-error.js'
import type { ListingsService } from '../listings/index.js'
import { auditActivity } from '../logging/index.js'
import type { ReviewRecord, ReviewsRepository } from './reviews.repository.js'
import type { CreateReviewBody, ListReviewsQuery, UpdateReviewBody } from './reviews.schema.js'
import type {
  PaginatedReviews,
  Review,
  ReviewStatusCounts,
  ReviewTargetOption,
} from './reviews.types.js'

export type ReviewsService = {
  listReviews: (query: ListReviewsQuery, actor: AuthActor) => Promise<PaginatedReviews>
  /** Internal count for other modules (no actor / authorization). */
  countReviewsByStatus: () => Promise<ReviewStatusCounts>
  listTargets: (
    targetType: CreateReviewBody['targetType'],
    actor: AuthActor,
  ) => Promise<ReviewTargetOption[]>
  getReviewById: (id: string, actor: AuthActor) => Promise<Review>
  createReview: (input: CreateReviewBody, actor: AuthActor) => Promise<Review>
  updateReview: (id: string, input: UpdateReviewBody, actor: AuthActor) => Promise<Review>
  deleteReview: (id: string, actor: AuthActor) => Promise<void>
}

export function toReviewDto(record: ReviewRecord): Review {
  return {
    id: record.id,
    authorId: record.authorId,
    author: {
      id: record.authorId,
      email: record.authorEmail,
      displayName: record.authorName,
    },
    targetType: record.targetType,
    targetId: record.targetId,
    targetName: record.targetName ?? REMOVED_TARGET_NAME,
    rating: record.rating,
    comment: record.comment,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function assertAdmin(actor: AuthActor, message: string) {
  if (!isAdmin(actor.roles)) {
    throw forbidden(message)
  }
}

export type ReviewsListingsGateway = Pick<
  ListingsService,
  'listingExists' | 'listListingChoices' | 'getListingNames'
>

const REMOVED_TARGET_NAME = 'Removed target'

export function createReviewsService(
  repository: ReviewsRepository,
  listings: ReviewsListingsGateway,
): ReviewsService {
  /** Fills LISTING target names (the repository leaves them null) with one batched lookup. */
  async function withListingNames(records: ReviewRecord[]): Promise<ReviewRecord[]> {
    const ids = [
      ...new Set(
        records.filter((record) => record.targetType === 'LISTING').map((r) => r.targetId),
      ),
    ]
    if (ids.length === 0) return records
    const names = new Map((await listings.getListingNames(ids)).map((l) => [l.id, l.name]))
    return records.map((record) =>
      record.targetType === 'LISTING'
        ? { ...record, targetName: names.get(record.targetId) ?? REMOVED_TARGET_NAME }
        : record,
    )
  }

  async function withListingName(record: ReviewRecord): Promise<ReviewRecord> {
    const [resolved] = await withListingNames([record])
    return resolved ?? record
  }

  async function loadOrThrow(id: string): Promise<ReviewRecord> {
    const review = await repository.findById(id)
    if (!review) {
      throw notFound('Review not found', 'REVIEW_NOT_FOUND')
    }
    return review
  }

  async function findTargetState(
    targetType: CreateReviewBody['targetType'],
    targetId: string,
  ): Promise<'ok' | 'missing' | 'not_worker'> {
    if (targetType === 'LISTING') {
      return (await listings.listingExists(targetId)) ? 'ok' : 'missing'
    }
    return repository.findTargetState(targetType, targetId)
  }

  async function assertTarget(targetType: CreateReviewBody['targetType'], targetId: string) {
    const state = await findTargetState(targetType, targetId)
    if (state === 'missing') {
      throw notFound('Review target not found', 'REVIEW_TARGET_NOT_FOUND')
    }
    if (state === 'not_worker') {
      throw validationError('Worker reviews must target a worker account')
    }
  }

  async function assertUnique(
    authorId: string,
    targetType: CreateReviewBody['targetType'],
    targetId: string,
    exceptId?: string,
  ) {
    const existing = await repository.findDuplicate(authorId, targetType, targetId)
    if (existing && existing.id !== exceptId) {
      throw conflict('This author already reviewed that target', 'REVIEW_ALREADY_EXISTS')
    }
  }

  return {
    countReviewsByStatus: () => repository.countByStatus(),

    async listReviews(query, actor) {
      assertAdmin(actor, 'Only admins can list reviews')
      const [{ items, total }, statusCounts] = await Promise.all([
        repository.findMany(query),
        query.counts === false
          ? Promise.resolve<ReviewStatusCounts>({ PENDING: 0, ACCEPTED: 0, REJECTED: 0 })
          : repository.countByStatus(),
      ])
      return {
        data: (await withListingNames(items)).map(toReviewDto),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          statusCounts,
        },
      }
    },

    async listTargets(targetType, actor) {
      assertAdmin(actor, 'Only admins can list review targets')
      if (targetType === 'LISTING') {
        return listings.listListingChoices({ take: 100 })
      }
      return repository.listTargets(targetType)
    },

    async getReviewById(id, actor) {
      const review = await loadOrThrow(id)
      if (!isAdmin(actor.roles) && review.authorId !== actor.id) {
        throw forbidden('You can only read your own reviews')
      }
      return toReviewDto(await withListingName(review))
    },

    async createReview(input, actor) {
      const admin = isAdmin(actor.roles)
      const authorId = admin ? (input.authorId ?? actor.id) : actor.id
      if (!admin && input.authorId && input.authorId !== actor.id) {
        throw forbidden('You can only review as yourself')
      }
      if (!admin && input.status && input.status !== 'PENDING') {
        throw forbidden('Only admins can set review status')
      }

      const author = await repository.findAuthor(authorId)
      if (!author) {
        throw notFound('Author not found', 'AUTHOR_NOT_FOUND')
      }
      if (author.status !== 'ACTIVE') {
        throw validationError('Author must be an active account')
      }

      await assertTarget(input.targetType, input.targetId)
      await assertUnique(authorId, input.targetType, input.targetId)

      try {
        const created = await repository.create({
          authorId,
          targetType: input.targetType,
          targetId: input.targetId,
          rating: input.rating,
          comment: input.comment,
          status: admin ? (input.status ?? 'PENDING') : 'PENDING',
        })
        return toReviewDto(await withListingName(created))
      } catch (error) {
        if (isUniqueConflictError(error)) {
          throw conflict('This author already reviewed that target', 'REVIEW_ALREADY_EXISTS')
        }
        throw error
      }
    },

    async updateReview(id, input, actor) {
      const review = await loadOrThrow(id)
      const admin = isAdmin(actor.roles)
      if (!admin && review.authorId !== actor.id) {
        throw forbidden('You can only edit your own reviews')
      }
      if (!admin && input.status !== undefined) {
        throw forbidden('Only admins can change review status')
      }

      const nextType = input.targetType ?? review.targetType
      const nextId = input.targetId ?? review.targetId
      if (input.targetType !== undefined || input.targetId !== undefined) {
        await assertTarget(nextType, nextId)
        await assertUnique(review.authorId, nextType, nextId, review.id)
      }

      const updated = await repository.update(id, {
        ...input,
        status: admin ? input.status : 'PENDING',
      })
      if (admin && input.status !== undefined && input.status !== review.status) {
        auditActivity({
          userId: actor.id,
          action: 'reviews.status_change',
          entity: 'review',
          entityId: id,
          meta: { from: review.status, to: input.status },
        })
      }
      return toReviewDto(await withListingName(updated))
    },

    async deleteReview(id, actor) {
      const review = await loadOrThrow(id)
      if (!isAdmin(actor.roles) && review.authorId !== actor.id) {
        throw forbidden('You can only remove your own reviews')
      }
      await repository.delete(id)
      auditActivity({
        userId: actor.id,
        action: 'reviews.delete',
        entity: 'review',
        entityId: id,
      })
    },
  }
}
