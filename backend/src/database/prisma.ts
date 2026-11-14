import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../generated/prisma/client.js'
import { logPerf } from '../logging/perf.js'

/**
 * Shared Prisma Client — import only from repositories (and rare infra), never controllers/services.
 * Lazy: created on first use so the API can boot without DATABASE_URL until persistence is needed.
 */
const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to use Prisma Client')
  }

  const adapter = new PrismaPg({ connectionString })
  const base = new PrismaClient({ adapter })

  const extended = base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const started = performance.now()
          try {
            return await query(args)
          } finally {
            const ms = Math.round(performance.now() - started)
            logPerf('prisma', `db ${String(model)}.${operation} ${ms}ms`, {
              model,
              operation,
              ms,
              // avoid dumping full args (PII); only count keys
              argKeys: args && typeof args === 'object' ? Object.keys(args as object) : [],
            })
          }
        },
      },
    },
  })

  return extended as unknown as PrismaClient
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

/** Lazy proxy — same rules as `getPrisma()`. */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrisma()
    const value = Reflect.get(client, property, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
})

export type { PrismaClient }
