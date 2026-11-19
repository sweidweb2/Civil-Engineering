import { z } from 'zod'

/** FormData sends booleans as "true"/"false" strings; JSON sends real booleans. */
export const formBooleanSchema = z.preprocess((value) => {
  if (value === 'true' || value === true) return true
  if (value === 'false' || value === false) return false
  return value
}, z.boolean())
