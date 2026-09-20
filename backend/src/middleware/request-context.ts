import type { RequestHandler } from 'express'
import { randomUUID } from 'node:crypto'

export const requestContext: RequestHandler = (req, res, next) => {
  const headerId = req.header('x-request-id')?.trim()
  const requestId = headerId && headerId.length > 0 ? headerId : randomUUID()

  req.requestId = requestId
  res.setHeader('x-request-id', requestId)
  next()
}
