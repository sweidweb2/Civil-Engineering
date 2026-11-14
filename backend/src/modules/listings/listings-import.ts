import type { CreateListingRecordInput } from './listings.repository.js'
import type { ListingImportRow, ListingStatus, RentalUnit } from './listings.schema.js'

const DECIMAL_PATTERN = /^\d{1,14}(\.\d{1,4})?$/
const CURRENCY_PATTERN = /^[A-Za-z]{3}$/
const RENTAL_UNITS = new Set<RentalUnit>(['HOUR', 'DAY', 'WEEK', 'MONTH'])
const STATUSES = new Set<ListingStatus>(['ACTIVE', 'INACTIVE'])

export type ImportCategory = {
  id: string
  name: string
  nameAr: string | null
  slug: string
  kind: 'MATERIAL' | 'EQUIPMENT' | 'SERVICE'
}

export type ImportRowResult =
  { ok: true; data: CreateListingRecordInput } | { ok: false; reason: string }

function cell(value: string | undefined): string {
  return (value ?? '').trim()
}

function isDecimal(value: string) {
  return DECIMAL_PATTERN.test(value)
}

export function resolveImportCategory(
  raw: string,
  categories: ImportCategory[],
): { id: string } | { error: string } {
  const needle = raw.trim().toLowerCase()
  if (!needle) return { error: 'Category is empty' }

  const bySlug = categories.filter((category) => category.slug.toLowerCase() === needle)
  if (bySlug.length === 1) return { id: bySlug[0]!.id }
  if (bySlug.length > 1) return { error: `Category "${raw}" matches multiple slugs` }

  const byName = categories.filter((category) => category.name.toLowerCase() === needle)
  if (byName.length === 1) return { id: byName[0]!.id }
  if (byName.length > 1) return { error: `Category "${raw}" matches multiple names` }

  const byNameAr = categories.filter(
    (category) => category.nameAr != null && category.nameAr.trim().toLowerCase() === needle,
  )
  if (byNameAr.length === 1) return { id: byNameAr[0]!.id }
  if (byNameAr.length > 1) return { error: `Category "${raw}" matches multiple Arabic names` }

  return { error: `Unknown category "${raw}"` }
}

/**
 * Validate one CSV row into a create payload. Unknown/blank optional cells are ignored.
 * Invalid optional enums/decimals fail the row (skip) rather than guessing.
 */
export function parseImportRow(
  row: ListingImportRow,
  providerId: string,
  categories: ImportCategory[],
): ImportRowResult {
  const name = cell(row.name)
  if (!name) return { ok: false, reason: 'Name is required' }
  if (name.length > 160) return { ok: false, reason: 'Name must be at most 160 characters' }

  const descriptionRaw = cell(row.description)
  if (descriptionRaw.length > 4000) {
    return { ok: false, reason: 'Description must be at most 4000 characters' }
  }
  const brandRaw = cell(row.brand)
  if (brandRaw.length > 120) return { ok: false, reason: 'Brand must be at most 120 characters' }
  const unitRaw = cell(row.unit)
  if (unitRaw.length > 40) return { ok: false, reason: 'Unit must be at most 40 characters' }

  let categoryId: string | null = null
  const categoryRaw = cell(row.category)
  if (categoryRaw) {
    const resolved = resolveImportCategory(categoryRaw, categories)
    if ('error' in resolved) return { ok: false, reason: resolved.error }
    categoryId = resolved.id
  }

  const currencyRaw = cell(row.currency)
  let currency: string | null = null
  if (currencyRaw) {
    if (!CURRENCY_PATTERN.test(currencyRaw)) {
      return { ok: false, reason: 'Currency must be a 3-letter code' }
    }
    currency = currencyRaw.toUpperCase()
  }

  const price = cell(row.price)
  const priceMin = cell(row.price_min)
  const priceMax = cell(row.price_max)
  const hasPrice = price.length > 0
  const hasMin = priceMin.length > 0
  const hasMax = priceMax.length > 0

  if (hasPrice && (hasMin || hasMax)) {
    return { ok: false, reason: 'Use either price or price_min/price_max, not both' }
  }
  if ((hasMin && !hasMax) || (!hasMin && hasMax)) {
    return { ok: false, reason: 'price_min and price_max must both be set for a range' }
  }
  if (hasPrice && !isDecimal(price)) {
    return { ok: false, reason: 'price must be a decimal with up to 4 places' }
  }
  if (hasMin && !isDecimal(priceMin)) {
    return { ok: false, reason: 'price_min must be a decimal with up to 4 places' }
  }
  if (hasMax && !isDecimal(priceMax)) {
    return { ok: false, reason: 'price_max must be a decimal with up to 4 places' }
  }
  if (hasMin && hasMax && Number(priceMin) > Number(priceMax)) {
    return { ok: false, reason: 'price_min must be less than or equal to price_max' }
  }

  const rentalPrice = cell(row.rental_price)
  const rentalUnitRaw = cell(row.rental_unit).toUpperCase()
  const hasRentalPrice = rentalPrice.length > 0
  const hasRentalUnit = rentalUnitRaw.length > 0
  if (hasRentalPrice !== hasRentalUnit) {
    return { ok: false, reason: 'rental_price and rental_unit must be set together' }
  }
  let rentalUnit: RentalUnit | null = null
  if (hasRentalPrice) {
    if (!isDecimal(rentalPrice)) {
      return { ok: false, reason: 'rental_price must be a decimal with up to 4 places' }
    }
    if (!RENTAL_UNITS.has(rentalUnitRaw as RentalUnit)) {
      return { ok: false, reason: 'rental_unit must be HOUR, DAY, WEEK, or MONTH' }
    }
    rentalUnit = rentalUnitRaw as RentalUnit
  }

  const quantityRaw = cell(row.quantity_available)
  if (quantityRaw && !isDecimal(quantityRaw)) {
    return { ok: false, reason: 'quantity_available must be a decimal with up to 4 places' }
  }

  const statusRaw = cell(row.status).toUpperCase()
  let status: ListingStatus = 'ACTIVE'
  if (statusRaw) {
    if (!STATUSES.has(statusRaw as ListingStatus)) {
      return { ok: false, reason: 'status must be ACTIVE or INACTIVE' }
    }
    status = statusRaw as ListingStatus
  }

  return {
    ok: true,
    data: {
      providerId,
      categoryId,
      name,
      description: descriptionRaw || null,
      brand: brandRaw || null,
      unit: unitRaw || null,
      currency,
      price: hasPrice ? price : null,
      priceMin: hasMin ? priceMin : null,
      priceMax: hasMax ? priceMax : null,
      rentalPrice: hasRentalPrice ? rentalPrice : null,
      rentalUnit,
      quantityAvailable: quantityRaw || null,
      status,
    },
  }
}
