import { prisma } from '../../database/prisma.js'

/** Read-only provider lookups for other modules. */
export async function findProviderIdByOwnerUserId(ownerUserId: string): Promise<string | null> {
  const row = await prisma.provider.findUnique({
    where: { ownerUserId },
    select: { id: true },
  })
  return row?.id ?? null
}

export async function findProviderOwnerUserId(providerId: string): Promise<string | null> {
  const row = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { ownerUserId: true },
  })
  return row?.ownerUserId ?? null
}
