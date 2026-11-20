import type { RequestHandler } from 'express'

import { newRequestId, runWithRequestContext, sanitizeRequestId } from '../logging/request-als.js'
import { clientIp } from '../modules/auth/client-meta.js'

/**
 * Assigns `x-request-id` and opens request AsyncLocalStorage for the whole handler chain
 * (services/jobs on this request can bind logs / activity rows to requestId + ip).
 */
export const requestContext: RequestHandler = (req, res, next) => {
  const requestId = sanitizeRequestId(req.header('x-request-id')) ?? newRequestId()
  const ip = clientIp(req) ?? undefined

  req.requestId = requestId
  res.setHeader('x-request-id', requestId)

  runWithRequestContext({ requestId, ip }, () => next())
}
