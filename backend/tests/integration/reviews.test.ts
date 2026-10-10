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

describe.skipIf(!hasDb)('reviews API (integration)', () => {
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

  async function createUser(role: 'ADMIN' | 'CLIENT' | 'PROVIDER', email: string) {
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

  it('forbids clients from listing reviews', async () => {
    const app = createApp({ config })
    await createUser('CLIENT', 'review-client@example.com')
    const token = await login(app, 'review-client@example.com')
    const res = await request(app).get('/api/v1/reviews').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })

  it('lets an admin review a provider, accept it, and delete it', async () => {
    const app = createApp({ config })
    await createUser('ADMIN', 'review-admin@example.com')
    const owner = await createUser('PROVIDER', 'review-owner@example.com')
    const token = await login(app, 'review-admin@example.com')

    const provider = await request(app)
      .post('/api/v1/providers')
      .set('Authorization', `Bearer ${token}`)
      .send({ ownerUserId: owner.id, name: 'Review Yard', status: 'APPROVED' })
    expect(provider.status).toBe(201)

    const created = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({
        targetType: 'PROVIDER',
        targetId: provider.body.data.id,
        rating: 5,
        comment: 'Reliable deliveries',
      })
    expect(created.status).toBe(201)
    expect(created.body.data.targetName).toBe('Review Yard')
    expect(created.body.data.status).toBe('PENDING')

    const list = await request(app).get('/api/v1/reviews').set('Authorization', `Bearer ${token}`)
    expect(list.status).toBe(200)
    expect(list.body.meta.statusCounts).toMatchObject({ PENDING: 1, ACCEPTED: 0, REJECTED: 0 })

    const accepted = await request(app)
      .patch(`/api/v1/reviews/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'ACCEPTED' })
    expect(accepted.status).toBe(200)
    expect(accepted.body.data.status).toBe('ACCEPTED')

    const removed = await request(app)
      .delete(`/api/v1/reviews/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(removed.status).toBe(204)
  })

  it('rejects a review for a missing target', async () => {
    const app = createApp({ config })
    await createUser('ADMIN', 'review-admin@example.com')
    const token = await login(app, 'review-admin@example.com')
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({
        targetType: 'PROVIDER',
        targetId: 'missing-provider',
        rating: 3,
        comment: 'Nobody home',
      })
    expect(res.status).toBe(404)
    expect(res.body.code).toBe('REVIEW_TARGET_NOT_FOUND')
  })
})
