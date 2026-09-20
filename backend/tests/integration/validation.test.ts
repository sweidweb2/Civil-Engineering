import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { loadConfig } from '../../src/config/index.js'

describe('Zod request validation', () => {
  const config = loadConfig({
    NODE_ENV: 'test',
    PORT: '3000',
    CORS_ORIGINS: 'http://localhost:5173',
    TRUST_PROXY: 'false',
  })
  const app = createApp({ config })

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
    const res = await request(app).get('/api/v1/expenses').query({ limit: '0' })

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
    })
  })

  it('rejects invalid params with 400 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/api/v1/users/%20')

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
    })
  })

  it('accepts valid query and returns list meta', async () => {
    const res = await request(app).get('/api/v1/expenses').query({ page: '2', limit: '10' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      data: [],
      meta: { page: 2, limit: 10 },
    })
  })
})
