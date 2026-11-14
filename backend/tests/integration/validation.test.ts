import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import { createApp } from '../../src/app.js'
import { signAccessToken } from '../../src/modules/auth/auth.tokens.js'
import { ensureTestJwtEnv, loadTestConfig } from '../helpers/test-config.js'

// Route modules import the production `authenticate`; swap it for one with a mock resolver.
vi.mock('../../src/middleware/authenticate.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/middleware/authenticate.js')>()
  return {
    ...actual,
    authenticate: actual.createAuthenticate({
      resolvePrincipal: async (userId) => ({
        id: userId,
        role: 'MANAGER',
        status: 'ACTIVE',
      }),
    }),
  }
})

describe('Zod request validation', () => {
  ensureTestJwtEnv()
  const config = loadTestConfig()
  const app = createApp({ config })
  const accessToken = signAccessToken(config, 'user-validation-1', 'MANAGER')

  it('rejects invalid body with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'x' })

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
    })
    expect(res.body.details).toBeTruthy()
  })

  it('rejects invalid query with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ limit: '0' })

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
    })
  })

  it('rejects invalid params with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .get('/api/v1/projects/%20')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
    })
  })

  it('accepts valid query past Zod (controller may still authorize/load data)', async () => {
    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ page: '2', limit: '10' })

    // Validated query reaches the handler; without a real user/DB row this may be empty or error,
    // but it must not be a Zod VALIDATION_ERROR.
    expect(res.status).not.toBe(400)
    expect(res.body?.code).not.toBe('VALIDATION_ERROR')
  })
})
