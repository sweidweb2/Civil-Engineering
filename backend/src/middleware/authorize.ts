import type { RequestHandler } from 'express'

import { forbidden, unauthorized } from '../errors/app-error.js'

/**
 * RBAC stub. Enforce roles in Auth foundation; default deny when auth is present but roles mismatch.
 */
export function authorize(...allowedRoles: string[]): RequestHandler {
  return (req, _res, next) => {
    if (allowedRoles.length === 0) {
      next()
      return
    }

    if (!req.user) {
      next(unauthorized())
      return
    }

    const hasRole = allowedRoles.some((role) => req.user?.roles.includes(role))
    if (!hasRole) {
      next(forbidden())
      return
    }

    next()
  }
}
