import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { clearUsers, disconnectPrisma, migrateTestDatabase } from '../helpers/test-db.js'
import { createE2EApp } from './helpers.js'

/**
 * Auth e2e against Test PostgreSQL (embedded via globalSetup or DATABASE_URL).
 * Requires DATABASE_URL from globalSetup + JWT secrets.
 */
describe('backend e2e (auth)', () => {
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

  it('full auth flow against real Postgres', async () => {
    const app = createE2EApp()

    const registered = await request(app).post('/api/v1/auth/register').send({
      email: 'e2e@example.com',
      password: 'password1',
      firstName: 'E2E',
    })

    expect(registered.status).toBe(201)
    expect(registered.body.tokens.accessToken).toBeTruthy()
    expect(registered.body.user.role).toBe('CLIENT')

    const loggedIn = await request(app).post('/api/v1/auth/login').send({
      email: 'e2e@example.com',
      password: 'password1',
    })
    expect(loggedIn.status).toBe(200)

    const refreshed = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: loggedIn.body.tokens.refreshToken,
    })
    expect(refreshed.status).toBe(200)
    expect(refreshed.body.refreshToken).toBeTruthy()

    const loggedOut = await request(app).post('/api/v1/auth/logout').send({
      refreshToken: refreshed.body.refreshToken,
    })
    expect(loggedOut.status).toBe(204)
  })
})
