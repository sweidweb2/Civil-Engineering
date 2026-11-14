/**
 * Database access surface.
 *
 * - Repositories import `prisma` from here only.
 * - Controllers/services must not import Prisma.
 * - Domain models are TBD — schema sections live in `prisma/schema.prisma`.
 */
export type { PrismaClient } from './prisma.js'
export { prisma } from './prisma.js'
export { closePool, getPool } from './pool.js'
