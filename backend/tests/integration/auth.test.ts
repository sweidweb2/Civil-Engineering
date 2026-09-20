import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { loadTestConfig } from '../helpers/test-config.js'
import {
  canConnectToDatabase,
  clearUsers,
  disconnectPrisma,
  migrateTestDatabase,
} from '../helpers/test-db.js'

const hasDb = await canConnectToDatabase()

describe.skipIf(!hasDb)('auth API (integration)', () => {
  const config = loadTestConfig({
    DATABASE_URL: process.env.DATABASE_URL,
  })

  beforeAll(async () => {
    await migrateTestDatabase()
  }, 60_000)

  beforeEach(async () => {
    await clearUsers()
  })

  afterAll(async () => {
    await clearUsers()
    await disconnectPrisma()
  })

  it('registers, logs in, refreshes, and logs out', async () => {
    const app = createApp({ config })

    const register = await request(app).post('/api/v1/auth/register').send({
      email: 'Ada@Example.com',
      password: 'password1',
      firstName: 'Ada',
      lastName: 'Lovelace',
    })

    expect(register.status).toBe(201)
    expect(register.body.user).toMatchObject({
      email: 'ada@example.com',
      role: 'CLIENT',
      profile: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        displayName: 'Ada Lovelace',
      },
    })
    expect(register.body.tokens.accessToken).toBeTruthy()
    expect(register.body.tokens.refreshToken).toBeTruthy()

    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'ada@example.com',
      password: 'password1',
    })
    expect(login.status).toBe(200)
    expect(login.body.user.id).toBe(register.body.user.id)

    const refresh = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: login.body.tokens.refreshToken,
    })
    expect(refresh.status).toBe(200)
    expect(refresh.body.accessToken).toBeTruthy()
    expect(refresh.body.refreshToken).toBeTruthy()

    const logout = await request(app).post('/api/v1/auth/logout').send({
      refreshToken: refresh.body.refreshToken,
    })
    expect(logout.status).toBe(204)
  })

  it('returns 409 when email is already registered', async () => {
    const app = createApp({ config })

    await request(app).post('/api/v1/auth/register').send({
      email: 'dup@example.com',
      password: 'password1',
    })

    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'dup@example.com',
      password: 'password1',
    })

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('CONFLICT')
  })

  it('returns 401 for bad login credentials', async () => {
    const app = createApp({ config })

    await request(app).post('/api/v1/auth/register').send({
      email: 'login@example.com',
      password: 'password1',
    })

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'login@example.com',
      password: 'wrong-password',
    })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('UNAUTHORIZED')
  })

  it('returns 401 for invalid refresh token', async () => {
    const app = createApp({ config })
    const res = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: 'not-a-valid-token',
    })
    expect(res.status).toBe(401)
    expect(res.body.code).toBe('UNAUTHORIZED')
  })
})
