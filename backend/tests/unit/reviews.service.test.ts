import { describe, expect, it, vi } from 'vitest'

import { AppError } from '../../src/errors/app-error.js'
import type { ReviewRecord, ReviewsRepository } from '../../src/modules/reviews/reviews.repository.js'
import { createReviewsService } from '../../src/modules/reviews/reviews.service.js'

const admin = { id: 'admin-1', roles: ['ADMIN'] }
const author = { id: 'user-1', roles: ['CLIENT'] }
const other = { id: 'user-2', roles: ['MANAGER'] }

function record(overrides: Partial<ReviewRecord> = {}): ReviewRecord {
  return {
    id: 'rev-1',
    authorId: author.id,
    authorEmail: 'client@example.com',
    authorName: 'Sami Aoun',
    targetType: 'PROVIDER',
    targetId: 'prov-1',
    targetName: 'Steel Works',
    rating: 5,
    comment: 'On time.',
    status: 'PENDING',
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    ...overrides,
  }
}

function setup(opts?: {
  existing?: ReviewRecord | null
  author?: { id: string; status: string } | null
  targetState?: 'ok' | 'missing' | 'not_worker'
  duplicate?: { id: string } | null
}) {
  const existing = opts?.existing === undefined ? record() : opts.existing
  const repository: ReviewsRepository = {
    findMany: vi.fn(async () => ({ items: existing ? [existing] : [], total: existing ? 1 : 0 })),
    countByStatus: vi.fn(async () => ({ PENDING: existing ? 1 : 0, ACCEPTED: 0, REJECTED: 0 })),
    findById: vi.fn(async () => existing),
    findDuplicate: vi.fn(async () => opts?.duplicate ?? null),
    findAuthor: vi.fn(async () => opts?.author ?? { id: author.id, status: 'ACTIVE' }),
    findTargetState: vi.fn(async () => opts?.targetState ?? 'ok'),
    listTargets: vi.fn(async () => []),
    create: vi.fn(async (input) =>
      record({
        authorId: input.authorId,
        targetType: input.targetType,
        targetId: input.targetId,
        rating: input.rating,
        comment: input.comment,
        status: input.status,
      }),
    ),
    update: vi.fn(async (_id, input) => record({ ...input, status: input.status ?? 'PENDING' })),
    delete: vi.fn(async () => undefined),
  }
  return { repository, service: createReviewsService(repository) }
}

const createInput = {
  targetType: 'PROVIDER' as const,
  targetId: 'prov-1',
  rating: 4,
  comment: 'Solid delivery.',
}

describe('reviewsService', () => {
  it('forbids non-admins from listing reviews', async () => {
    const { service } = setup()
    await expect(service.listReviews({ page: 1, limit: 20 }, author)).rejects.toMatchObject({ status: 403 })
  })

  it('creates a pending review for the signed-in author', async () => {
    const { service, repository } = setup({ existing: null })
    const created = await service.createReview(createInput, author)
    expect(created.status).toBe('PENDING')
    expect(created.authorId).toBe(author.id)
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ authorId: author.id, status: 'PENDING' }))
  })

  it('rejects a review for a missing target', async () => {
    const { service } = setup({ existing: null, targetState: 'missing' })
    await expect(service.createReview(createInput, author)).rejects.toMatchObject({
      status: 404,
      code: 'REVIEW_TARGET_NOT_FOUND',
    })
  })

  it('rejects a second review of the same target by the same author', async () => {
    const { service } = setup({ existing: null, duplicate: { id: 'rev-1' } })
    await expect(service.createReview(createInput, author)).rejects.toBeInstanceOf(AppError)
    await expect(service.createReview(createInput, author)).rejects.toMatchObject({
      status: 409,
      code: 'REVIEW_ALREADY_EXISTS',
    })
  })

  it('lets an admin accept a review', async () => {
    const { service } = setup()
    await expect(service.updateReview('rev-1', { status: 'ACCEPTED' }, admin)).resolves.toMatchObject({
      id: 'rev-1',
    })
  })

  it('returns an author edit to pending and blocks status changes', async () => {
    const { service, repository } = setup({ existing: record({ status: 'ACCEPTED' }) })
    await service.updateReview('rev-1', { comment: 'Updated.' }, author)
    expect(repository.update).toHaveBeenCalledWith('rev-1', expect.objectContaining({ status: 'PENDING' }))
    await expect(service.updateReview('rev-1', { status: 'ACCEPTED' }, author)).rejects.toMatchObject({
      status: 403,
    })
  })

  it('forbids another user from deleting the review', async () => {
    const { service } = setup()
    await expect(service.deleteReview('rev-1', other)).rejects.toMatchObject({ status: 403 })
  })

  it('lets an admin delete a review', async () => {
    const { service, repository } = setup()
    await service.deleteReview('rev-1', admin)
    expect(repository.delete).toHaveBeenCalledWith('rev-1')
  })
})
