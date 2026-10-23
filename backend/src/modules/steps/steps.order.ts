import { validationError } from '../../errors/app-error.js'

const MAX_ORDER = 10_000

/**
 * Pick a free order slot. If `requested` is missing or already taken, use the
 * smallest non-negative integer not in `used`.
 */
export function resolveOrderNb(
  used: readonly number[],
  requested: number | undefined,
): { orderNb: number; orderAdjusted: boolean } {
  const taken = new Set(used)
  if (requested !== undefined && Number.isInteger(requested) && requested >= 0 && !taken.has(requested)) {
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
