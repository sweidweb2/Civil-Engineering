import { prisma } from '../../database/prisma.js'

/** Read-only listing lookups for other modules. They must not query the listings table themselves. */
export async function findListingNames(ids: string[]): Promise<Array<{ id: string; name: string }>> {
  if (ids.length === 0) return []
  return prisma.listing.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  })
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
