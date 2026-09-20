import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { loadTestConfig } from '../helpers/test-config.js'
import { clearUsers, disconnectPrisma, migrateTestDatabase } from '../helpers/test-db.js'

/**
 * Auth e2e against Test PostgreSQL (embedded via globalSetup or Docker).
 * Requires DATABASE_URL from globalSetup + JWT secrets.
 */
describe('backend e2e (auth)', () => {
  const config = loadTestConfig({
    DATABASE_URL: process.env.DATABASE_URL,
  })

  beforeAll(() => {
    migrateTestDatabase()
  })

  beforeEach(async () => {
    await clearUsers()
  })

  afterAll(async () => {
    await clearUsers()
    await disconnectPrisma()
  })

  it('full auth flow against real Postgres', async () => {
    const app = createApp({ config })

    const registered = await request(app).post('/api/v1/auth/register').send({
      email: 'e2e@example.com',
      password: 'password1',
      firstName: 'E2E',
    })

    expect(registered.status).toBe(201)
    expect(registered.body.tokens.accessToken).toBeTruthy()

    const loggedIn = await request(app).post('/api/v1/auth/login').send({
      email: 'e2e@example.com',
      password: 'password1',
    })
    expect(loggedIn.status).toBe(200)

    const refreshed = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: loggedIn.body.tokens.refreshToken,
    })
    expect(refreshed.status).toBe(200)

    const loggedOut = await request(app).post('/api/v1/auth/logout').send({
      refreshToken: refreshed.body.refreshToken,
    })
    expect(loggedOut.status).toBe(204)
  })
})
