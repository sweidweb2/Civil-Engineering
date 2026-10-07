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

describe.skipIf(!hasDb)('users API (integration)', () => {
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

  async function createUser(role: 'ADMIN' | 'CLIENT', email: string) {
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

  it('requires auth for listing users', async () => {
    const app = createApp({ config })
    const res = await request(app).get('/api/v1/users')
    expect(res.status).toBe(401)
  })

  it('forbids non-admins from listing users', async () => {
    const app = createApp({ config })
    await createUser('CLIENT', 'client@example.com')
    const token = await login(app, 'client@example.com')
    const res = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })

  it('lets an admin create and list users', async () => {
    const app = createApp({ config })
    await createUser('ADMIN', 'admin-users@example.com')
    const token = await login(app, 'admin-users@example.com')

    const created = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'pm@example.com',
        password: 'password1',
        role: 'MANAGER',
        firstName: 'Pat',
        lastName: 'Manager',
      })

    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({
      email: 'pm@example.com',
      role: 'MANAGER',
    })

    const list = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${token}`)
    expect(list.status).toBe(200)
    expect(list.body.meta.total).toBeGreaterThanOrEqual(2)
  })

  it('lets a user read their own profile but not another client', async () => {
    const app = createApp({ config })
    const self = await createUser('CLIENT', 'self@example.com')
    const other = await createUser('CLIENT', 'other@example.com')
    const token = await login(app, 'self@example.com')

    const own = await request(app)
      .get(`/api/v1/users/${self.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(own.status).toBe(200)
    expect(own.body.data.email).toBe('self@example.com')

    const denied = await request(app)
      .get(`/api/v1/users/${other.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(denied.status).toBe(403)
  })
})
