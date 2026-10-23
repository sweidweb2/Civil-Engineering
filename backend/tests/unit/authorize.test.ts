import express from 'express'
import request from 'supertest'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { errorHandler } from '../../src/errors/error.middleware.js'
import { setAccessPrincipalResolver } from '../../src/middleware/access-principal.js'
import { authenticate } from '../../src/middleware/authenticate.js'
import { authorize } from '../../src/middleware/authorize.js'
import type { RoleName } from '../../src/modules/auth/auth.schema.js'
import { signAccessToken } from '../../src/modules/auth/auth.tokens.js'
import { ensureTestJwtEnv, loadTestConfig } from '../helpers/test-config.js'

describe('authorize middleware', () => {
  const config = loadTestConfig()

  beforeAll(() => {
    ensureTestJwtEnv()
  })

  beforeEach(() => {
    setAccessPrincipalResolver(async (userId) => {
      if (userId === 'admin-1') {
        return { id: userId, role: 'ADMIN', status: 'ACTIVE' }
      }
      return { id: userId, role: 'CLIENT', status: 'ACTIVE' }
    })
  })

  afterEach(() => {
    setAccessPrincipalResolver(null)
  })

  function gatedApp(...roles: RoleName[]) {
    const app = express()
    app.get('/admin', authenticate, authorize(...roles), (req, res) => {
      res.status(200).json({ user: req.user })
    })
    app.use(errorHandler)
    return app
  }

  it('rejects unauthenticated requests', async () => {
    const res = await request(gatedApp('ADMIN')).get('/admin')
    expect(res.status).toBe(401)
  })

  it('forbids authenticated users without an allowed role', async () => {
    const access = signAccessToken(config, 'user-1', 'CLIENT')
    const res = await request(gatedApp('ADMIN', 'SUPER'))
      .get('/admin')
      .set('Authorization', `Bearer ${access}`)
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FORBIDDEN')
  })

  it('allows matching roles', async () => {
    const access = signAccessToken(config, 'admin-1', 'ADMIN')
    const res = await request(gatedApp('ADMIN', 'SUPER'))
      .get('/admin')
      .set('Authorization', `Bearer ${access}`)
    expect(res.status).toBe(200)
    expect(res.body.user.roles).toEqual(['ADMIN'])
  })
})
