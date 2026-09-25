import type { DomainDefinition } from '../_shared/domain-definition.js'

export const providersDomain = {
  name: 'providers',
  responsibility:
    'Owns the provider company profile (one per owner user). Marketplace visibility is gated by admin approval. Does not own listings, orders, or user credentials.',
  entities: [
    {
      name: 'Provider',
      description:
        'Company profile: owner, contact, location, and approval status. Table name is providers (not companies).',
    },
  ],
  valueObjects: [
    {
      name: 'ProviderStatus',
      description: 'PENDING | APPROVED | SUSPENDED — invisible until Admin approves.',
    },
  ],
  useCases: ['listProviders', 'getProviderById', 'createProvider', 'updateProvider', 'listOwnerCandidates'],
  relationships: ['Provider.ownerUserId → User (users). One provider per owner.'],
  externalAccessRules: [
    'Other modules read providers only via the public providers service.',
    'Status changes to APPROVED / SUSPENDED are admin-only.',
    'Unapproved providers stay off the public marketplace.',
  ],
} as const satisfies DomainDefinition
