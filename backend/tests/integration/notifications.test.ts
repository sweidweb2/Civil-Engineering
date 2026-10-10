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

describe.skipIf(!hasDb)('notifications API (integration)', () => {
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

  async function createUser(role: 'SUPER' | 'CLIENT', email: string) {
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

  it('requires auth for notifications', async () => {
    const app = createApp({ config })
    const res = await request(app).get('/api/v1/notifications')
    expect(res.status).toBe(401)
  })

  it('lets SUPER create a notification and the receiver read it', async () => {
    const app = createApp({ config })
    await createUser('SUPER', 'super-n@example.com')
    const receiver = await createUser('CLIENT', 'recv@example.com')
    const superToken = await login(app, 'super-n@example.com')
    const receiverToken = await login(app, 'recv@example.com')

    const created = await request(app)
      .post('/api/v1/notifications')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        receiverId: receiver.id,
        title: 'Welcome',
        message: 'Your account is ready',
        type: 'INFO',
      })

    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({
      title: 'Welcome',
      receiverId: receiver.id,
    })

    const list = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${receiverToken}`)
    expect(list.status).toBe(200)
    expect(list.body.data.length).toBeGreaterThanOrEqual(1)

    const unread = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${receiverToken}`)
    expect(unread.status).toBe(200)
    expect(unread.body.data.count).toBeGreaterThanOrEqual(1)

    const read = await request(app)
      .post(`/api/v1/notifications/${created.body.data.id}/read`)
      .set('Authorization', `Bearer ${receiverToken}`)
    expect(read.status).toBe(200)
    expect(read.body.data.isRead).toBe(true)
  })

  it('scopes a super inbox to the caller and marks every unread row read', async () => {
    const app = createApp({ config })
    const superUser = await createUser('SUPER', 'super-mine@example.com')
    const receiver = await createUser('CLIENT', 'recv-mine@example.com')
    const superToken = await login(app, 'super-mine@example.com')

    const forSuper = await request(app)
      .post('/api/v1/notifications')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        receiverId: superUser.id,
        title: 'For super',
        message: 'Your own row',
        type: 'INFO',
      })
    expect(forSuper.status).toBe(201)

    const forClient = await request(app)
      .post('/api/v1/notifications')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        receiverId: receiver.id,
        title: 'For client',
        message: 'Someone else',
        type: 'INFO',
      })
    expect(forClient.status).toBe(201)

    const mine = await request(app)
      .get('/api/v1/notifications')
      .query({ mine: 'true' })
      .set('Authorization', `Bearer ${superToken}`)
    expect(mine.status).toBe(200)
    expect(mine.body.data).toHaveLength(1)
    expect(mine.body.data[0].receiverId).toBe(superUser.id)
    expect(mine.body.meta.counts).toMatchObject({ active: 1, unread: 1, deleted: 0 })

    const all = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${superToken}`)
    expect(all.status).toBe(200)
    expect(all.body.meta.counts.active).toBe(2)

    const marked = await request(app)
      .post('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${superToken}`)
    expect(marked.status).toBe(200)
    expect(marked.body.data.count).toBe(1)

    const after = await request(app)
      .get('/api/v1/notifications')
      .query({ mine: 'true' })
      .set('Authorization', `Bearer ${superToken}`)
    expect(after.body.meta.counts).toMatchObject({ active: 1, unread: 0, deleted: 0 })
  })

  it('forbids clients from creating notifications', async () => {
    const app = createApp({ config })
    const client = await createUser('CLIENT', 'client-n@example.com')
    const token = await login(app, 'client-n@example.com')

    const res = await request(app)
      .post('/api/v1/notifications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        receiverId: client.id,
        title: 'Nope',
        message: 'Should fail',
      })

    expect(res.status).toBe(403)
  })
})
