import { z } from 'zod'

/**
 * Optional `counts` list query flag (`false`/`0` opts out of expensive aggregate counts).
 * Parses string query values; omitted means "include counts".
 */
export const countsQuerySchema = z.preprocess((value) => {
  if (value === 'false' || value === '0' || value === false) return false
  if (value === 'true' || value === '1' || value === true) return true
  return value
}, z.boolean().optional())
