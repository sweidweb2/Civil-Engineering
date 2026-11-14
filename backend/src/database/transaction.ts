import type { Prisma } from '../generated/prisma/client.js'
import { prisma, type PrismaClient } from './prisma.js'

/** Client usable inside repositories for interactive transactions. */
export type DbClient = Prisma.TransactionClient | PrismaClient

export function runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn)
}
