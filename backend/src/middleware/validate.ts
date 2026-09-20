import type { RequestHandler } from 'express'
import type { ZodType } from 'zod'

type ValidateTarget = {
  body?: ZodType
  query?: ZodType
  params?: ZodType
}

/**
 * Zod validation at the HTTP edge. Assigns parsed values back onto the request.
 */
export function validate(schemas: ValidateTarget): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body)
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as typeof req.query
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params
      }
      next()
    } catch (error) {
      next(error)
    }
  }
}
