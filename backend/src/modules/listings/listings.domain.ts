import type { DomainDefinition } from '../_shared/domain-definition.js'

export const listingsDomain = {
  name: 'listings',
  responsibility:
    'Owns provider directory listings: materials, equipment, and services. Prices are informational. There is no checkout.',
  entities: [
    {
      name: 'Listing',
      description:
        'A provider catalog record with type, category, price, unit, and optional rental price. Variations and offers stay on the same listing.',
    },
  ],
  valueObjects: [
    {
      name: 'ListingType',
      description: 'MATERIAL | EQUIPMENT | SERVICE. Must match the category kind.',
    },
    {
      name: 'ListingStatus',
      description: 'ACTIVE | INACTIVE.',
    },
  ],
  useCases: ['listListings', 'getListingById', 'createListing', 'updateListing', 'deleteListing'],
  relationships: [
    'Listing.providerId → Provider.',
    'Listing.categoryId → Category. Category kind must equal the listing type.',
    'ListingVariation and ListingOffer cascade when a listing is removed.',
    'A listing with reviews is hidden (INACTIVE) instead of removed, because reviews store the listing id without a foreign key.',
  ],
  externalAccessRules: [
    'Admins and project managers can read listings.',
    'Creating, editing, and deleting listings is admin-only.',
    'Other modules do not query the listings table directly.',
  ],
} as const satisfies DomainDefinition
