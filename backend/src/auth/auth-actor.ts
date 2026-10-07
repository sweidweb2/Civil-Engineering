import type { Request } from 'express'

import type { AuthActor } from '../authz/index.js'
import { unauthorized } from '../errors/app-error.js'

export type { AuthActor }

/** Read the authenticated actor from `req.user` (set by authenticate middleware). */
export function parseAuthActor(req: Request): AuthActor {
  if (!req.user) {
    throw unauthorized()
  }
  return { id: req.user.id, roles: req.user.roles }
}
