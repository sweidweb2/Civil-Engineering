import type { RequestHandler } from 'express'

/**
 * JWT authentication stub. Verify access tokens in Auth foundation.
 * Pass-through until JWT is wired — protected routes will require this middleware later.
 */
export const authenticate: RequestHandler = (_req, _res, next) => {
  next()
}
