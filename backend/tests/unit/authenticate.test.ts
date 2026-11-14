import express from 'express'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { errorHandler } from '../../src/errors/error.middleware.js'
import type { ResolveAccessPrincipal } from '../../src/middleware/access-principal.js'
import { createAuthenticate } from '../../src/middleware/authenticate.js'
import { signAccessToken, signRefreshToken } from '../../src/modules/auth/auth.tokens.js'
import { ensureTestJwtEnv, loadTestConfig } from '../helpers/test-config.js'

describe('authenticate middleware', () => {
  const config = loadTestConfig()

  beforeAll(() => {
    ensureTestJwtEnv()
  })

  const activeAdmin: ResolveAccessPrincipal = async (userId) => ({
    id: userId,
    role: 'ADMIN',
    status: 'ACTIVE',
  })

  function protectedApp(resolvePrincipal: ResolveAccessPrincipal = activeAdmin) {
    const app = express()
    app.get('/protected', createAuthenticate({ resolvePrincipal }), (req, res) => {
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

  it('accepts a valid access token from the civil_access cookie', async () => {
    const access = signAccessToken(config, 'user-1', 'CLIENT')
    const res = await request(protectedApp())
      .get('/protected')
      .set('Cookie', `civil_access=${encodeURIComponent(access)}`)

    expect(res.status).toBe(200)
    expect(res.body.user.id).toBe('user-1')
  })

  it('rejects when the principal is inactive', async () => {
    const access = signAccessToken(config, 'user-1', 'ADMIN')
    const res = await request(
      protectedApp(async (userId) => ({ id: userId, role: 'ADMIN', status: 'INACTIVE' })),
    )
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
