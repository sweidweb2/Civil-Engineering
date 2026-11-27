import { createHash } from 'node:crypto'
import type { RequestHandler, Response } from 'express'

import { prisma } from '../database/prisma.js'
import { conflict, validationError } from '../errors/app-error.js'
import { maybePurgeExpiredIdempotencyKeys } from '../jobs/index.js'
import { getRequestLogger } from '../logging/index.js'
import { Prisma } from '../generated/prisma/client.js'

import { stableStringify } from './stable-json.js'

/**
 * Idempotency for create endpoints (Docs/[3] Decisions/[14] Mobile Offline Read Cache.md).
 *
 * A client that times out after the server already created a record retries with the
 * same `Idempotency-Key`; the stored 2xx response is replayed instead of creating a
 * duplicate. The header is optional: requests without it behave exactly as before.
 *
 * Default storage is **Postgres** (`idempotency_records`) so keys survive process
 * restarts and are shared across API instances. Unit tests inject an in-memory store.
 */

export const IDEMPOTENCY_HEADER = 'idempotency-key'
export const IDEMPOTENCY_REPLAYED_HEADER = 'idempotent-replayed'
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/

type Entry =
  | { state: 'pending'; bodyHash: string; expiresAt: number }
  | { state: 'done'; bodyHash: string; expiresAt: number; status: number; body: unknown }

export type IdempotencyStore = {
  get: (scope: string) => Promise<Entry | undefined> | Entry | undefined
  /** Atomically claim a pending slot. Returns false if the scope already exists. */
  tryBegin: (scope: string, bodyHash: string, expiresAt: number) => Promise<boolean> | boolean
  set: (scope: string, entry: Entry) => Promise<void> | void
  delete: (scope: string) => Promise<void> | void
  size?: () => number
  ttlMs: number
}

/** In-memory store for unit tests (not shared across processes). */
export function createIdempotencyStore(
  options: { ttlMs?: number; maxEntries?: number; now?: () => number } = {},
): IdempotencyStore {
  const ttlMs = options.ttlMs ?? 24 * 60 * 60_000
  const maxEntries = options.maxEntries ?? 10_000
  const now = options.now ?? Date.now
  const map = new Map<string, Entry>()

  return {
    ttlMs,
    get(scope) {
      const entry = map.get(scope)
      if (!entry) return undefined
      if (now() > entry.expiresAt) {
        map.delete(scope)
        return undefined
      }
      return entry
    },
    tryBegin(scope, bodyHash, expiresAt) {
      const existing = map.get(scope)
      if (existing && now() <= existing.expiresAt) return false
      map.set(scope, { state: 'pending', bodyHash, expiresAt })
      while (map.size > maxEntries) {
        const oldest = map.keys().next().value
        if (oldest === undefined) break
        map.delete(oldest)
      }
      return true
    },
    set(scope, entry) {
      map.delete(scope)
      map.set(scope, entry)
      while (map.size > maxEntries) {
        const oldest = map.keys().next().value
        if (oldest === undefined) break
        map.delete(oldest)
      }
    },
    delete(scope) {
      map.delete(scope)
    },
    size: () => map.size,
  }
}

function toEntry(row: {
  bodyHash: string
  state: string
  status: number | null
  body: unknown
  expiresAt: Date
}): Entry | undefined {
  if (row.expiresAt.getTime() <= Date.now()) return undefined
  if (row.state === 'pending') {
    return { state: 'pending', bodyHash: row.bodyHash, expiresAt: row.expiresAt.getTime() }
  }
  if (row.state === 'done' && row.status != null) {
    return {
      state: 'done',
      bodyHash: row.bodyHash,
      expiresAt: row.expiresAt.getTime(),
      status: row.status,
      body: row.body,
    }
  }
  return undefined
}

/** Postgres-backed store — default for the running API. */
export function createPrismaIdempotencyStore(options: { ttlMs?: number } = {}): IdempotencyStore {
  const ttlMs = options.ttlMs ?? 24 * 60 * 60_000

  return {
    ttlMs,
    async get(scope) {
      const row = await prisma.idempotencyRecord.findUnique({ where: { scope } })
      if (!row) return undefined
      const entry = toEntry(row)
      if (!entry) {
        await prisma.idempotencyRecord.delete({ where: { scope } }).catch(() => undefined)
        return undefined
      }
      return entry
    },
    async tryBegin(scope, bodyHash, expiresAt) {
      try {
        await prisma.idempotencyRecord.create({
          data: {
            scope,
            bodyHash,
            state: 'pending',
            expiresAt: new Date(expiresAt),
          },
        })
        return true
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return false
        }
        throw error
      }
    },
    async set(scope, entry) {
      await prisma.idempotencyRecord.upsert({
        where: { scope },
        create: {
          scope,
          bodyHash: entry.bodyHash,
          state: entry.state,
          status: entry.state === 'done' ? entry.status : null,
          body: entry.state === 'done' ? (entry.body as Prisma.InputJsonValue) : Prisma.JsonNull,
          expiresAt: new Date(entry.expiresAt),
        },
        update: {
          bodyHash: entry.bodyHash,
          state: entry.state,
          status: entry.state === 'done' ? entry.status : null,
          body: entry.state === 'done' ? (entry.body as Prisma.InputJsonValue) : Prisma.JsonNull,
          expiresAt: new Date(entry.expiresAt),
        },
      })
    },
    async delete(scope) {
      await prisma.idempotencyRecord.delete({ where: { scope } }).catch(() => undefined)
    },
  }
}

const defaultStore = createPrismaIdempotencyStore()

function hashBody(body: unknown) {
  return createHash('sha256')
    .update(stableStringify(body ?? null))
    .digest('hex')
}

async function resolveGet(store: IdempotencyStore, scope: string) {
  return await store.get(scope)
}

/**
 * Mount on a POST route **after** `authenticate` (keys are scoped per user) and
 * **before** `validate` (the raw body is hashed).
 */
export function idempotent(
  store: IdempotencyStore = defaultStore,
  options: { now?: () => number } = {},
): RequestHandler {
  const now = options.now ?? Date.now

  return (req, res, next) => {
    void (async () => {
      const key = req.get(IDEMPOTENCY_HEADER)
      if (req.method !== 'POST' || key === undefined) {
        next()
        return
      }
      if (!KEY_PATTERN.test(key)) {
        next(validationError('Idempotency-Key must be 8-128 characters of A-Z, a-z, 0-9, - or _'))
        return
      }

      const scope = `${req.user?.id ?? 'anonymous'} ${req.method} ${req.baseUrl}${req.path} ${key}`
      const bodyHash = hashBody(req.body)
      const existing = await resolveGet(store, scope)

      if (existing) {
        if (existing.bodyHash !== bodyHash) {
          next(
            conflict(
              'This Idempotency-Key was already used with a different request body',
              'IDEMPOTENCY_KEY_REUSED',
            ),
          )
          return
        }
        if (existing.state === 'pending') {
          next(
            conflict(
              'A request with this Idempotency-Key is still being processed',
              'IDEMPOTENCY_IN_PROGRESS',
            ),
          )
          return
        }
        res.setHeader(IDEMPOTENCY_REPLAYED_HEADER, 'true')
        res.status(existing.status).json(existing.body)
        return
      }

      const began = await store.tryBegin(scope, bodyHash, now() + store.ttlMs)
      if (!began) {
        const raced = await resolveGet(store, scope)
        if (raced?.bodyHash && raced.bodyHash !== bodyHash) {
          next(
            conflict(
              'This Idempotency-Key was already used with a different request body',
              'IDEMPOTENCY_KEY_REUSED',
            ),
          )
          return
        }
        if (raced?.state === 'done') {
          res.setHeader(IDEMPOTENCY_REPLAYED_HEADER, 'true')
          res.status(raced.status).json(raced.body)
          return
        }
        next(
          conflict(
            'A request with this Idempotency-Key is still being processed',
            'IDEMPOTENCY_IN_PROGRESS',
          ),
        )
        return
      }

      void maybePurgeExpiredIdempotencyKeys()

      const originalJson = res.json.bind(res) as Response['json']
      res.json = ((body: unknown) => {
        // Persist before the client sees the body so a crash mid-flight cannot
        // leave a pending key that blocks legitimate retries without a replay.
        void (async () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              await store.set(scope, {
                state: 'done',
                bodyHash,
                expiresAt: now() + store.ttlMs,
                status: res.statusCode,
                body,
              })
            } else {
              await store.delete(scope)
            }
          } catch (error) {
            getRequestLogger().warn(
              { err: error, scope, kind: 'idempotency.persist_failed' },
              'failed to persist idempotency outcome',
            )
            await Promise.resolve(store.delete(scope)).catch(() => undefined)
          }
          originalJson(body)
        })()
        return res
      }) as Response['json']

      res.on('close', () => {
        void (async () => {
          const current = await resolveGet(store, scope)
          if (current?.state === 'pending') await store.delete(scope)
        })()
      })

      next()
    })().catch(next)
  }
}
