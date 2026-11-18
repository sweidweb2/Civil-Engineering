import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { clearUsers, disconnectPrisma, migrateTestDatabase } from '../helpers/test-db.js'
import { authHeader, createE2EApp, createE2EUser, loginE2E } from './helpers.js'

/**
 * PM profile + change-password journey used by /pm/settings.
 */
describe('backend e2e (manager profile)', () => {
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

  it('upserts CV profile and changes password for a manager', async () => {
    const app = createE2EApp()
    await createE2EUser('MANAGER', 'pm-profile@example.com')
    const session = await loginE2E(app, 'pm-profile@example.com')

    const upserted = await request(app)
      .put('/api/v1/manager-profiles/me')
      .set(authHeader(session.accessToken))
      .send({
        headline: 'Site PM',
        specialty: 'Concrete',
        city: 'Beirut',
        country: 'Lebanon',
        yearsExperience: 5,
      })
    expect(upserted.status).toBe(200)
    expect(upserted.body.data).toMatchObject({
      headline: 'Site PM',
      specialty: 'Concrete',
      city: 'Beirut',
    })

    const mine = await request(app)
      .get('/api/v1/manager-profiles/me')
      .set(authHeader(session.accessToken))
    expect(mine.status).toBe(200)
    expect(mine.body.data.headline).toBe('Site PM')

    const changed = await request(app)
      .post('/api/v1/auth/change-password')
      .set(authHeader(session.accessToken))
      .send({
        currentPassword: 'password1',
        newPassword: 'password2',
        confirmPassword: 'password2',
      })
    expect(changed.status).toBe(200)
    expect(changed.body.accessToken).toBeTruthy()
    expect(changed.body.refreshToken).toBeTruthy()

    const oldLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'pm-profile@example.com',
      password: 'password1',
    })
    expect(oldLogin.status).toBe(401)

    const newLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'pm-profile@example.com',
      password: 'password2',
    })
    expect(newLogin.status).toBe(200)
  })
})
