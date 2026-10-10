import type { DomainDefinition } from '../_shared/domain-definition.js'

export const reviewsDomain = {
  name: 'reviews',
  responsibility:
    'Owns directory ratings for providers, workers, and listings. Any active account may leave one review per target. Admins moderate by accepting, rejecting, or removing reviews.',
  entities: [
    {
      name: 'Review',
      description:
        'Author, polymorphic target (provider, worker user, or listing), rating, comment, and moderation status.',
    },
  ],
  valueObjects: [
    {
      name: 'ReviewStatus',
      description: 'PENDING | ACCEPTED | REJECTED — only accepted reviews are public.',
    },
    {
      name: 'ReviewTargetType',
      description: 'PROVIDER | WORKER | LISTING.',
    },
  ],
  useCases: [
    'listReviews',
    'listReviewTargets',
    'getReviewById',
    'createReview',
    'updateReview',
    'deleteReview',
  ],
  relationships: [
    'Review.authorId → User.',
    'Review.targetId → Provider, worker User, or Listing, chosen by targetType. No database foreign key.',
  ],
  externalAccessRules: [
    'Other modules read reviews only through the public reviews service.',
    'Status changes and removal of another user\'s review are admin-only.',
    'A non-admin edit returns the review to PENDING.',
  ],
} as const satisfies DomainDefinition
