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

describe.skipIf(!hasDb)('steps API (integration)', () => {
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

  async function createManager(email: string) {
    const prisma = getPrisma()
    return prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword('password1'),
        role: 'MANAGER',
        status: 'ACTIVE',
        profile: {
          create: { firstName: 'PM', lastName: 'Test', displayName: 'PM Test' },
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

  it('lets a manager create and list a step', async () => {
    const app = createApp({ config })
    await createManager('pm-steps@example.com')
    const token = await login(app, 'pm-steps@example.com')

    const created = await request(app)
      .post('/api/v1/steps')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Foundation', status: 'ACTIVE' })
    expect(created.status).toBe(201)
    expect(created.body.data.name).toBe('Foundation')

    const listed = await request(app)
      .get('/api/v1/steps?page=1&limit=20')
      .set('Authorization', `Bearer ${token}`)
    expect(listed.status).toBe(200)
    expect(listed.body.data).toHaveLength(1)
    expect(listed.body.data[0].name).toBe('Foundation')
  })
})
