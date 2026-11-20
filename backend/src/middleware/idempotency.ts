import { createHash } from 'node:crypto'
import type { RequestHandler, Response } from 'express'

import { conflict, validationError } from '../errors/app-error.js'

/**
 * Idempotency for create endpoints (Docs/[3] Decisions/[14] Mobile Offline Read Cache.md).
 *
 * A client that times out after the server already created a record retries with the
 * same `Idempotency-Key`; the stored 2xx response is replayed instead of creating a
 * duplicate. The header is optional: requests without it behave exactly as before.
 *
 * Storage is **in-process memory**, like the rate limiter (Redis was removed — see
 * Docs/[3] Decisions/[8] Redis.md): keys are not shared across API instances and are
 * lost on restart. That is acceptable for the single-instance deployment; a shared
 * store would need its own decision.
 */

export const IDEMPOTENCY_HEADER = 'idempotency-key'
export const IDEMPOTENCY_REPLAYED_HEADER = 'idempotent-replayed'
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/

type Entry =
  | { state: 'pending'; bodyHash: string; expiresAt: number }
  | { state: 'done'; bodyHash: string; expiresAt: number; status: number; body: unknown }

export type IdempotencyStore = {
  get: (scope: string) => Entry | undefined
  set: (scope: string, entry: Entry) => void
  delete: (scope: string) => void
  size: () => number
}

export function createIdempotencyStore(
  options: { ttlMs?: number; maxEntries?: number; now?: () => number } = {},
): IdempotencyStore & { ttlMs: number } {
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
    set(scope, entry) {
      map.delete(scope)
      map.set(scope, entry)
      // Oldest first (insertion order); expired or not, the cap bounds memory.
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

const defaultStore = createIdempotencyStore()

function hashBody(body: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(body ?? null))
    .digest('hex')
}

/**
 * Mount on a POST route **after** `authenticate` (keys are scoped per user) and
 * **before** `validate` (the raw body is hashed).
 */
export function idempotent(
  store: IdempotencyStore & { ttlMs: number } = defaultStore,
  options: { now?: () => number } = {},
): RequestHandler {
  const now = options.now ?? Date.now

  return (req, res, next) => {
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
    const existing = store.get(scope)

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

    store.set(scope, { state: 'pending', bodyHash, expiresAt: now() + store.ttlMs })

    // Record the outcome: keep 2xx for replay; drop anything else so a corrected
    // retry (after a validation error, for example) is processed normally.
    const originalJson = res.json.bind(res) as Response['json']
    res.json = ((body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        store.set(scope, {
          state: 'done',
          bodyHash,
          expiresAt: now() + store.ttlMs,
          status: res.statusCode,
          body,
        })
      } else {
        store.delete(scope)
      }
      return originalJson(body)
    }) as Response['json']

    // Connection closed or response sent without json(): never leave a key stuck pending.
    res.on('close', () => {
      if (store.get(scope)?.state === 'pending') store.delete(scope)
    })

    next()
  }
}
