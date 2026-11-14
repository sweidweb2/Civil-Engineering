import { conflict, isUniqueConflictError, validationError } from '../../errors/app-error.js'
import type { ActiveInputTypeRef } from '../input-types/index.js'

const MAX_ORDER = 10_000
const MAX_ALLOCATION_ATTEMPTS = 5

export type OrderMeta = { orderAdjusted: boolean; orderNb: number }

/**
 * Pick a free order slot. If `requested` is missing or already taken, use the
 * smallest non-negative integer not in `used`.
 */
export function resolveOrderNb(
  used: readonly number[],
  requested: number | undefined,
): { orderNb: number; orderAdjusted: boolean } {
  const taken = new Set(used)
  if (
    requested !== undefined &&
    Number.isInteger(requested) &&
    requested >= 0 &&
    !taken.has(requested)
  ) {
    return { orderNb: requested, orderAdjusted: false }
  }

  let next = 0
  while (taken.has(next)) {
    next += 1
    if (next > MAX_ORDER) {
      throw validationError('No available order slots left')
    }
  }
  return { orderNb: next, orderAdjusted: true }
}

export function orderMeta(orderNb: number, orderAdjusted: boolean): OrderMeta | undefined {
  return orderAdjusted ? { orderAdjusted: true, orderNb } : undefined
}

/**
 * Resolve a free order, persist, and retry on unique-order races.
 */
export async function allocateOrdered<T>(options: {
  listUsed: () => Promise<readonly number[]>
  requested: number | undefined
  persist: (orderNb: number) => Promise<T>
  conflictMessage: string
  conflictCode: string
}): Promise<{ data: T; meta?: OrderMeta }> {
  let requested = options.requested
  for (let attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt += 1) {
    const used = await options.listUsed()
    const { orderNb, orderAdjusted } = resolveOrderNb(used, requested)
    try {
      const data = await options.persist(orderNb)
      return { data, meta: orderMeta(orderNb, orderAdjusted || attempt > 0) }
    } catch (error) {
      if (!isUniqueConflictError(error)) throw error
      requested = undefined
    }
  }
  throw conflict(options.conflictMessage, options.conflictCode)
}

/**
 * Shared template/instance create path: resolve ACTIVE input type, then allocate order.
 */
export async function allocateOrderedWithActiveType<T>(options: {
  requireActiveInputType: (id: string) => Promise<ActiveInputTypeRef>
  inputTypeId: string
  listUsed: () => Promise<readonly number[]>
  requested: number | undefined
  persist: (orderNb: number, inputType: ActiveInputTypeRef) => Promise<T>
  conflictMessage: string
  conflictCode: string
}): Promise<{ data: T; meta?: OrderMeta }> {
  const inputType = await options.requireActiveInputType(options.inputTypeId)
  return allocateOrdered({
    listUsed: options.listUsed,
    requested: options.requested,
    persist: (orderNb) => options.persist(orderNb, inputType),
    conflictMessage: options.conflictMessage,
    conflictCode: options.conflictCode,
  })
}
