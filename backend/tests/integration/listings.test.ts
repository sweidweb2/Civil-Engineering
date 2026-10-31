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

describe.skipIf(!hasDb)('listings API (integration)', () => {
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

  async function createUser(role: 'ADMIN' | 'MANAGER' | 'PROVIDER' | 'CLIENT', email: string) {
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

  async function seedCatalog(app: ReturnType<typeof createApp>, token: string) {
    const owner = await createUser('PROVIDER', 'listing-owner@example.com')
    const provider = await request(app)
      .post('/api/v1/providers')
      .set('Authorization', `Bearer ${token}`)
      .send({ ownerUserId: owner.id, name: 'Yard Co', status: 'APPROVED' })
    expect(provider.status).toBe(201)

    const category = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cement', kind: 'MATERIAL' })
    expect(category.status).toBe(201)

    return {
      providerId: provider.body.data.id as string,
      categoryId: category.body.data.id as string,
    }
  }

  function listingBody(providerId: string, categoryId: string, name = 'Portland cement') {
    return {
      providerId,
      categoryId,
      name,
      unit: 'bag',
      currency: 'usd',
      price: '12.5',
    }
  }

  it('requires auth and forbids clients from listing records', async () => {
    const app = createApp({ config })
    const open = await request(app).get('/api/v1/listings')
    expect(open.status).toBe(401)

    await createUser('CLIENT', 'listing-client@example.com')
    const token = await login(app, 'listing-client@example.com')
    const denied = await request(app)
      .get('/api/v1/listings')
      .set('Authorization', `Bearer ${token}`)
    expect(denied.status).toBe(403)
  })

  it('lets a manager read listings and forbids them from creating', async () => {
    const app = createApp({ config })
    await createUser('ADMIN', 'listing-admin@example.com')
    await createUser('MANAGER', 'listing-manager@example.com')
    const adminToken = await login(app, 'listing-admin@example.com')
    const managerToken = await login(app, 'listing-manager@example.com')
    const { providerId, categoryId } = await seedCatalog(app, adminToken)

    const list = await request(app)
      .get('/api/v1/listings')
      .set('Authorization', `Bearer ${managerToken}`)
    expect(list.status).toBe(200)
    expect(list.body.meta.typeCounts).toMatchObject({ MATERIAL: 0, EQUIPMENT: 0, SERVICE: 0 })

    const created = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${managerToken}`)
      .send(listingBody(providerId, categoryId))
    expect(created.status).toBe(403)
  })

  it('creates a listing with a decimal price and rejects a bad currency or rental pair', async () => {
    const app = createApp({ config })
    await createUser('ADMIN', 'listing-admin@example.com')
    const token = await login(app, 'listing-admin@example.com')
    const { providerId, categoryId } = await seedCatalog(app, token)

    const created = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${token}`)
      .send(listingBody(providerId, categoryId))
    expect(created.status).toBe(201)
    expect(created.body.data.currency).toBe('USD')
    expect(typeof created.body.data.price).toBe('string')
    expect(created.body.data.price.startsWith('12.5')).toBe(true)

    const badCurrency = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...listingBody(providerId, categoryId, 'Bad currency'), currency: 'US' })
    expect(badCurrency.status).toBe(400)

    const badRental = await request(app)
      .patch(`/api/v1/listings/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rentalPrice: '4' })
    expect(badRental.status).toBe(400)
  })

  it('rejects an inactive or provider-scoped category', async () => {
    const app = createApp({ config })
    await createUser('ADMIN', 'listing-admin@example.com')
    const token = await login(app, 'listing-admin@example.com')
    const { providerId, categoryId } = await seedCatalog(app, token)

    const hidden = await request(app)
      .patch(`/api/v1/categories/${categoryId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: false })
    expect(hidden.status).toBe(200)

    const inactive = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${token}`)
      .send(listingBody(providerId, categoryId))
    expect(inactive.status).toBe(400)

    const prisma = getPrisma()
    const shopCategory = await prisma.category.create({
      data: {
        scope: 'PROVIDER',
        providerId,
        kind: 'MATERIAL',
        name: 'Shop cement',
        slug: 'shop-cement',
      },
    })
    const scoped = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${token}`)
      .send(listingBody(providerId, shopCategory.id, 'Scoped cement'))
    expect(scoped.status).toBe(400)
  })

  it('deletes an unreferenced listing and hides one that a review still names', async () => {
    const app = createApp({ config })
    await createUser('ADMIN', 'listing-admin@example.com')
    const token = await login(app, 'listing-admin@example.com')
    const { providerId, categoryId } = await seedCatalog(app, token)

    const plain = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${token}`)
      .send(listingBody(providerId, categoryId, 'Loose gravel'))
    expect(plain.status).toBe(201)

    const removed = await request(app)
      .delete(`/api/v1/listings/${plain.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(removed.status).toBe(200)
    expect(removed.body.data.outcome).toBe('deleted')

    const missing = await request(app)
      .get(`/api/v1/listings/${plain.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(missing.status).toBe(404)

    const reviewed = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${token}`)
      .send(listingBody(providerId, categoryId, 'Reviewed sand'))
    expect(reviewed.status).toBe(201)

    const review = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({
        targetType: 'LISTING',
        targetId: reviewed.body.data.id,
        rating: 4,
        comment: 'Solid stock',
      })
    expect(review.status).toBe(201)

    const hidden = await request(app)
      .delete(`/api/v1/listings/${reviewed.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(hidden.status).toBe(200)
    expect(hidden.body.data.outcome).toBe('hidden')

    const stillThere = await request(app)
      .get(`/api/v1/listings/${reviewed.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(stillThere.status).toBe(200)
    expect(stillThere.body.data.status).toBe('INACTIVE')
  })
})
