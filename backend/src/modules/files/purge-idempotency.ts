import { prisma } from '../../database/prisma.js'

/** Delete expired idempotency rows. Returns how many were removed. */
export async function purgeExpiredIdempotencyRecords(now = new Date()): Promise<number> {
  const result = await prisma.idempotencyRecord.deleteMany({
    where: { expiresAt: { lte: now } },
  })
  return result.count
}
