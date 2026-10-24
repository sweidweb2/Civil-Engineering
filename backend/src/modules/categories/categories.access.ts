import { prisma } from '../../database/prisma.js'

/** Read-only category lookups for other modules. They must not query categories themselves. */
export async function findPlatformCategory(
  id: string,
): Promise<{ id: string; scope: string; isActive: boolean } | null> {
  return prisma.category.findUnique({
    where: { id },
    select: { id: true, scope: true, isActive: true },
  })
}
