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

describe.skipIf(!hasDb)('categories API (integration)', () => {
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

  async function createUser(role: 'ADMIN' | 'MANAGER' | 'PROVIDER', email: string) {
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

  it('lets a manager list categories and forbids them from creating', async () => {
    const app = createApp({ config })
    await createUser('MANAGER', 'cat-manager@example.com')
    const token = await login(app, 'cat-manager@example.com')

    const list = await request(app).get('/api/v1/categories').set('Authorization', `Bearer ${token}`)
    expect(list.status).toBe(200)
    expect(list.body.meta.kindCounts).toMatchObject({
      MATERIAL: 0,
      EQUIPMENT: 0,
      SERVICE: 0,
      WORKER: 0,
    })

    const created = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Timber', kind: 'MATERIAL' })
    expect(created.status).toBe(403)
  })

  it('lets an admin create, rename, and delete a category', async () => {
    const app = createApp({ config })
    await createUser('ADMIN', 'cat-admin@example.com')
    const token = await login(app, 'cat-admin@example.com')

    const created = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Timber', kind: 'MATERIAL' })
    expect(created.status).toBe(201)
    expect(created.body.data.slug).toBe('timber')

    const renamed = await request(app)
      .patch(`/api/v1/categories/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hardwood' })
    expect(renamed.status).toBe(200)
    expect(renamed.body.data.name).toBe('Hardwood')

    const removed = await request(app)
      .delete(`/api/v1/categories/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(removed.status).toBe(204)
  })

  it('refuses to delete a category that still has a listing', async () => {
    const app = createApp({ config })
    await createUser('ADMIN', 'cat-admin@example.com')
    const owner = await createUser('PROVIDER', 'cat-owner@example.com')
    const token = await login(app, 'cat-admin@example.com')

    const provider = await request(app)
      .post('/api/v1/providers')
      .set('Authorization', `Bearer ${token}`)
      .send({ ownerUserId: owner.id, name: 'Mill Co', status: 'APPROVED' })
    expect(provider.status).toBe(201)

    const category = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Boards', kind: 'MATERIAL' })
    expect(category.status).toBe(201)

    const listing = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        providerId: provider.body.data.id,
        categoryId: category.body.data.id,
        type: 'MATERIAL',
        name: 'Oak board',
        unit: 'm',
        currency: 'USD',
        price: '8',
      })
    expect(listing.status).toBe(201)

    const removed = await request(app)
      .delete(`/api/v1/categories/${category.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(removed.status).toBe(409)
    expect(removed.body.code).toBe('CATEGORY_IN_USE')
  })
})
