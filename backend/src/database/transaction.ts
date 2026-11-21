import type { Prisma } from '../generated/prisma/client.js'
import { prisma, type PrismaClient } from './prisma.js'

/** Client usable inside repositories for interactive transactions. */
export type DbClient = Prisma.TransactionClient | PrismaClient

export type TransactionOptions = {
  /** How long to wait for a free connection (ms). */
  maxWait?: number
  /** Max interactive transaction duration (ms). Prisma default is 5000 — too low for remote Supabase RTT. */
  timeout?: number
}

/** Room for multi-statement writes over a remote pooler (Prisma default 5s is easy to blow). */
export const DEFAULT_TX_TIMEOUT_MS = 30_000
export const DEFAULT_TX_MAX_WAIT_MS = 10_000

export function runInTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: TransactionOptions,
): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: options?.maxWait ?? DEFAULT_TX_MAX_WAIT_MS,
    timeout: options?.timeout ?? DEFAULT_TX_TIMEOUT_MS,
  })
}
