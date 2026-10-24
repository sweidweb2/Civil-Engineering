import { createListingsController } from './listings.controller.js'
import { createListingsRepository } from './listings.repository.js'
import { createListingsRoutes } from './listings.routes.js'
import { createListingsService } from './listings.service.js'

export function createListingsModule() {
  const repository = createListingsRepository()
  const service = createListingsService(repository)
  const controller = createListingsController(service)
  return createListingsRoutes(controller)
}

export {
  findListingNames,
  findListingSnapshot,
  listingExists,
  listListingChoices,
  searchListingIdsByName,
} from './listings.access.js'
export type { ListingSnapshot } from './listings.access.js'
export { listingsDomain } from './listings.domain.js'
export { createListingsService }
export type { ListingsService } from './listings.service.js'
