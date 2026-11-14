import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { errorHandler } from '../../src/errors/error.middleware.js'
import { requireTrustedOrigin } from '../../src/middleware/trusted-origin.js'

describe('requireTrustedOrigin middleware', () => {
  const allowed = ['http://localhost:5173']
  const cookie = 'civil_access=token'

  function app() {
    const server = express()
    server.use(requireTrustedOrigin(allowed))
    server.all('/thing', (_req, res) => {
      res.status(200).json({ ok: true })
    })
    server.use(errorHandler)
    return server
  }

  it('allows cookie-authenticated POST from an allowed Origin', async () => {
    const res = await request(app())
      .post('/thing')
      .set('Cookie', cookie)
      .set('Origin', 'http://localhost:5173')
    expect(res.status).toBe(200)
  })

  it('falls back to Referer when Origin is absent', async () => {
    const res = await request(app())
      .patch('/thing')
      .set('Cookie', cookie)
      .set('Referer', 'http://localhost:5173/projects/1')
    expect(res.status).toBe(200)
  })

  it('rejects cookie-authenticated mutation from a foreign Origin', async () => {
    const res = await request(app())
      .delete('/thing')
      .set('Cookie', cookie)
      .set('Origin', 'https://evil.example')
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('UNTRUSTED_ORIGIN')
  })

  it('rejects cookie-authenticated mutation with no Origin or Referer', async () => {
    const res = await request(app()).put('/thing').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it('covers the refresh cookie too', async () => {
    const res = await request(app())
      .post('/thing')
      .set('Cookie', 'civil_refresh=token')
      .set('Origin', 'https://evil.example')
    expect(res.status).toBe(403)
  })

  it('skips Bearer-authenticated requests', async () => {
    const res = await request(app())
      .post('/thing')
      .set('Authorization', 'Bearer abc')
      .set('Cookie', cookie)
      .set('Origin', 'https://evil.example')
    expect(res.status).toBe(200)
  })

  it('skips requests without auth cookies (nothing ambient to forge)', async () => {
    const res = await request(app()).post('/thing').set('Origin', 'https://evil.example')
    expect(res.status).toBe(200)
  })

  it('skips safe methods', async () => {
    const res = await request(app())
      .get('/thing')
      .set('Cookie', cookie)
      .set('Origin', 'https://evil.example')
    expect(res.status).toBe(200)
  })
})
