import { AsyncLocalStorage } from 'node:async_hooks'
import { createHash, randomUUID } from 'node:crypto'

import type { Logger } from 'pino'

import { getLogger } from './logger.js'

export type RequestAlsStore = {
  requestId?: string
  userId?: string
  ip?: string
  route?: string
}

const als = new AsyncLocalStorage<RequestAlsStore>()

/** Max length for inbound `x-request-id` (reject forged / oversized ids). */
const MAX_REQUEST_ID_LENGTH = 128
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]+$/

/** Accept a client-supplied request id only when it is short and safe to log/store. */
export function sanitizeRequestId(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > MAX_REQUEST_ID_LENGTH) return undefined
  if (!REQUEST_ID_PATTERN.test(trimmed)) return undefined
  return trimmed
}

export function newRequestId(): string {
  return randomUUID()
}

export function runWithRequestContext<T>(store: RequestAlsStore, fn: () => T): T {
  return als.run(store, fn)
}

export function getRequestStore(): RequestAlsStore | undefined {
  return als.getStore()
}

export function getRequestId(): string | undefined {
  return als.getStore()?.requestId
}

export function setRequestUserId(userId: string): void {
  const store = als.getStore()
  if (store) store.userId = userId
}

export function setRequestRoute(route: string): void {
  const store = als.getStore()
  if (store) store.route = route
}

/** Child logger bound to the current request (falls back to root outside a request). */
export function getRequestLogger(): Logger {
  const store = als.getStore()
  if (!store?.requestId && !store?.userId) return getLogger()
  return getLogger().child({
    ...(store.requestId ? { requestId: store.requestId } : {}),
    ...(store.userId ? { userId: store.userId } : {}),
  })
}

/** Non-reversible email hint for auth-failure logs (never log the raw address). */
export function hashEmailHint(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 12)
}
