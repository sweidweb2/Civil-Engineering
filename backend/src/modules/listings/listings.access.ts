import { prisma } from '../../database/prisma.js'
import { decimalToString } from './listings.repository.js'

/** Fields snapshotted into project step input values for CATEGORY fields. */
export type ListingSnapshot = {
  id: string
  name: string
  type: string
  categoryId: string
  brand: string | null
  unit: string
  currency: string
  price: string
  rentalPrice: string | null
  rentalUnit: string | null
  providerId: string
  status: string
  description: string | null
}

/** Read-only listing lookups for other modules. They must not query the listings table themselves. */
export async function findListingNames(ids: string[]): Promise<Array<{ id: string; name: string }>> {
  if (ids.length === 0) return []
  return prisma.listing.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  })
}

export async function findListingSnapshot(id: string): Promise<ListingSnapshot | null> {
  const row = await prisma.listing.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      type: true,
      categoryId: true,
      brand: true,
      unit: true,
      currency: true,
      price: true,
      rentalPrice: true,
      rentalUnit: true,
      providerId: true,
      status: true,
      description: true,
    },
  })
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    categoryId: row.categoryId,
    brand: row.brand,
    unit: row.unit,
    currency: row.currency,
    price: decimalToString(row.price) ?? '0',
    rentalPrice: decimalToString(row.rentalPrice),
    rentalUnit: row.rentalUnit,
    providerId: row.providerId,
    status: row.status,
    description: row.description,
  }
}

export async function searchListingIdsByName(q: string, take = 100): Promise<string[]> {
  const rows = await prisma.listing.findMany({
    where: { name: { contains: q, mode: 'insensitive' } },
    select: { id: true },
    take,
  })
  return rows.map((row) => row.id)
}

export async function listingExists(id: string): Promise<boolean> {
  const row = await prisma.listing.findUnique({ where: { id }, select: { id: true } })
  return row != null
}

export async function listListingChoices(
  take = 100,
): Promise<Array<{ id: string; name: string; subtitle: string }>> {
  const rows = await prisma.listing.findMany({
    orderBy: { name: 'asc' },
    take,
    select: { id: true, name: true, type: true },
  })
  return rows.map((row) => ({ id: row.id, name: row.name, subtitle: row.type }))
}
