import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { getPrisma } from '../../src/database/prisma.js'
import { hashPassword } from '../../src/modules/auth/auth.tokens.js'
import { loadTestConfig } from '../helpers/test-config.js'
import {
  canConnectToDatabase,
  clearUsers,
  disconnectPrisma,
  migrateTestDatabase,
} from '../helpers/test-db.js'

const hasDb = await canConnectToDatabase()

describe.skipIf(!hasDb)('manager-profiles API (integration)', () => {
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

  async function createUser(role: 'MANAGER' | 'CLIENT', email: string) {
    const prisma = getPrisma()
    return prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword('password1'),
        role,
        status: 'ACTIVE',
        profile: {
          create: { firstName: role, lastName: 'Test', displayName: `${role} Test` },
        },
      },
    })
  }

  async function login(app: ReturnType<typeof createApp>, email: string) {
    const res = await request(app).post('/api/v1/auth/login').send({
      email,
      password: 'password1',
    })
    expect(res.status).toBe(200)
    return res.body.tokens.accessToken as string
  }

  it('requires auth', async () => {
    const app = createApp({ config })
    const res = await request(app).get('/api/v1/manager-profiles/me')
    expect(res.status).toBe(401)
  })

  it('forbids non-managers', async () => {
    const app = createApp({ config })
    await createUser('CLIENT', 'client-mp@example.com')
    const token = await login(app, 'client-mp@example.com')

    const res = await request(app)
      .get('/api/v1/manager-profiles/me')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })

  it('supports create, read, update, upsert, and delete for a manager', async () => {
    const app = createApp({ config })
    await createUser('MANAGER', 'pm-mp@example.com')
    const token = await login(app, 'pm-mp@example.com')

    const empty = await request(app)
      .get('/api/v1/manager-profiles/me')
      .set('Authorization', `Bearer ${token}`)
    expect(empty.status).toBe(200)
    expect(empty.body.data).toBeNull()

    const created = await request(app)
      .post('/api/v1/manager-profiles/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        headline: 'Civil engineer',
        city: 'Beirut',
        yearsExperience: 7,
      })
    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({
      headline: 'Civil engineer',
      city: 'Beirut',
      yearsExperience: 7,
    })

    const duplicate = await request(app)
      .post('/api/v1/manager-profiles/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ headline: 'Other' })
    expect(duplicate.status).toBe(409)

    const patched = await request(app)
      .patch('/api/v1/manager-profiles/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ specialty: 'Structural' })
    expect(patched.status).toBe(200)
    expect(patched.body.data.specialty).toBe('Structural')

    const upserted = await request(app)
      .put('/api/v1/manager-profiles/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'Tripoli', country: 'Lebanon' })
    expect(upserted.status).toBe(200)
    expect(upserted.body.data).toMatchObject({ city: 'Tripoli', country: 'Lebanon' })

    const deleted = await request(app)
      .delete('/api/v1/manager-profiles/me')
      .set('Authorization', `Bearer ${token}`)
    expect(deleted.status).toBe(204)

    const afterDelete = await request(app)
      .get('/api/v1/manager-profiles/me')
      .set('Authorization', `Bearer ${token}`)
    expect(afterDelete.status).toBe(200)
    expect(afterDelete.body.data).toBeNull()
  })
})
