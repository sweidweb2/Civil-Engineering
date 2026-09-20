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

describe.skipIf(!hasDb)('logging API (integration)', () => {
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

  async function createUser(role: 'SUPER' | 'ADMIN' | 'CLIENT', email: string) {
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

  it('requires auth for activity-logs', async () => {
    const app = createApp({ config })
    const res = await request(app).get('/api/v1/activity-logs')
    expect(res.status).toBe(401)
  })

  it('forbids non-SUPER roles from activity-logs', async () => {
    const app = createApp({ config })
    await createUser('ADMIN', 'admin-logs@example.com')
    const token = await login(app, 'admin-logs@example.com')

    const res = await request(app)
      .get('/api/v1/activity-logs')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
  })

  it('lists activity logs for SUPER', async () => {
    const app = createApp({ config })
    await createUser('SUPER', 'super-logs@example.com')
    const token = await login(app, 'super-logs@example.com')

    // login wrote an activity row
    const res = await request(app)
      .get('/api/v1/activity-logs')
      .query({ page: 1, limit: 10 })
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.meta).toMatchObject({ page: 1, limit: 10 })
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.some((row: { action: string }) => row.action === 'auth.login')).toBe(true)
  })

  it('lists error logs for SUPER', async () => {
    const app = createApp({ config })
    await createUser('SUPER', 'super-errors@example.com')
    const token = await login(app, 'super-errors@example.com')

    const prisma = getPrisma()
    await prisma.errorLog.create({
      data: {
        message: 'boom',
        code: 'INTERNAL_ERROR',
        status: 500,
        path: '/api/v1/test',
        method: 'GET',
      },
    })

    const res = await request(app).get('/api/v1/error-logs').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data[0]).toMatchObject({
      message: 'boom',
      status: 500,
    })
  })
})
