import type { Request, RequestHandler } from 'express'
import { z, type ZodType } from 'zod'

type ValidateTarget = {
  body?: ZodType
  query?: ZodType
  params?: ZodType
}

function replaceRequestProperty(req: object, key: 'query' | 'params' | 'body', value: unknown) {
  Object.defineProperty(req, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  })
}

/**
 * Zod validation at the HTTP edge. Assigns parsed values back onto the request.
 * Uses defineProperty because Express 5 exposes read-only `query` / `params` getters.
 */
export function validate(schemas: ValidateTarget): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.body) {
        replaceRequestProperty(req, 'body', schemas.body.parse(req.body))
      }
      if (schemas.query) {
        replaceRequestProperty(req, 'query', schemas.query.parse(req.query))
      }
      if (schemas.params) {
        replaceRequestProperty(req, 'params', schemas.params.parse(req.params))
      }
      next()
    } catch (error) {
      next(error)
    }
  }
}

/** Imperative body validation used by merged notifications / project-images controllers. */
export async function validateBody(req: Request, schema: ZodType): Promise<void> {
  replaceRequestProperty(req, 'body', schema.parse(req.body))
}

/** Imperative query validation. */
export async function validateQuery(req: Request, schema: ZodType): Promise<void> {
  replaceRequestProperty(req, 'query', schema.parse(req.query))
}

/** Imperative params validation — accepts a Zod object or a field-shape record. */
export async function validateParams(
  req: Request,
  schemaOrShape: ZodType | Record<string, ZodType>,
): Promise<void> {
  const schema =
    typeof schemaOrShape === 'object' &&
    schemaOrShape !== null &&
    'parse' in schemaOrShape &&
    typeof schemaOrShape.parse === 'function'
      ? (schemaOrShape as ZodType)
      : z.object(schemaOrShape as Record<string, ZodType>)
  replaceRequestProperty(req, 'params', schema.parse(req.params))
}
