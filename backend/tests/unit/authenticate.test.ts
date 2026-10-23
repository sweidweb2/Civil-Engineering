import express from 'express'
import request from 'supertest'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { errorHandler } from '../../src/errors/error.middleware.js'
import { setAccessPrincipalResolver } from '../../src/middleware/access-principal.js'
import { authenticate } from '../../src/middleware/authenticate.js'
import { signAccessToken, signRefreshToken } from '../../src/modules/auth/auth.tokens.js'
import { ensureTestJwtEnv, loadTestConfig } from '../helpers/test-config.js'

describe('authenticate middleware', () => {
  const config = loadTestConfig()

  beforeAll(() => {
    ensureTestJwtEnv()
  })

  beforeEach(() => {
    setAccessPrincipalResolver(async (userId) => ({
      id: userId,
      role: 'ADMIN',
      status: 'ACTIVE',
    }))
  })

  afterEach(() => {
    setAccessPrincipalResolver(null)
  })

  function protectedApp() {
    const app = express()
    app.get('/protected', authenticate, (req, res) => {
      res.status(200).json({ user: req.user })
    })
    app.use(errorHandler)
    return app
  }

  it('rejects missing Authorization header', async () => {
    const res = await request(protectedApp()).get('/protected')
    expect(res.status).toBe(401)
    expect(res.body.code).toBe('UNAUTHORIZED')
  })

  it('rejects invalid Bearer token', async () => {
    const res = await request(protectedApp())
      .get('/protected')
      .set('Authorization', 'Bearer not-a-jwt')
    expect(res.status).toBe(401)
  })

  it('rejects refresh token used as access token', async () => {
    const refresh = signRefreshToken(config, 'user-1', 'CLIENT')
    const res = await request(protectedApp())
      .get('/protected')
      .set('Authorization', 'Bearer ' + refresh)
    expect(res.status).toBe(401)
  })

  it('attaches req.user from DB role for a valid access token', async () => {
    const access = signAccessToken(config, 'user-1', 'CLIENT')
    const res = await request(protectedApp())
      .get('/protected')
      .set('Authorization', `Bearer ${access}`)

    expect(res.status).toBe(200)
    // JWT said CLIENT; resolver returns ADMIN — DB wins.
    expect(res.body.user).toEqual({
      id: 'user-1',
      roles: ['ADMIN'],
    })
  })

  it('rejects when the principal is inactive', async () => {
    setAccessPrincipalResolver(async (userId) => ({
      id: userId,
      role: 'ADMIN',
      status: 'INACTIVE',
    }))
    const access = signAccessToken(config, 'user-1', 'ADMIN')
    const res = await request(protectedApp())
      .get('/protected')
      .set('Authorization', `Bearer ${access}`)
    expect(res.status).toBe(401)
  })

  it('does not protect public health without auth', async () => {
    const app = createApp({ config })
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
  })
})
