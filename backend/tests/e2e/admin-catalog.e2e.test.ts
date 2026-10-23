import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { clearUsers, disconnectPrisma, migrateTestDatabase } from '../helpers/test-db.js'
import { authHeader, createE2EApp, createE2EUser, loginE2E } from './helpers.js'

/**
 * Admin marketplace catalog journey: category → provider → listing.
 */
describe('backend e2e (admin catalog)', () => {
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

  it('creates a category, provider, and listing end-to-end', async () => {
    const app = createE2EApp()
    await createE2EUser('ADMIN', 'admin-catalog@example.com')
    const providerUser = await createE2EUser('PROVIDER', 'provider-catalog@example.com')
    const admin = await loginE2E(app, 'admin-catalog@example.com')

    const category = await request(app)
      .post('/api/v1/categories')
      .set(authHeader(admin.accessToken))
      .send({ name: 'Aggregates', kind: 'MATERIAL' })
    expect(category.status).toBe(201)
    const categoryId = category.body.data.id as string

    const provider = await request(app)
      .post('/api/v1/providers')
      .set(authHeader(admin.accessToken))
      .send({
        name: 'Coastal Supplies',
        ownerUserId: providerUser.id,
        status: 'APPROVED',
      })
    expect(provider.status).toBe(201)
    const providerId = provider.body.data.id as string

    const listing = await request(app)
      .post('/api/v1/listings')
      .set(authHeader(admin.accessToken))
      .send({
        providerId,
        categoryId,
        type: 'MATERIAL',
        name: 'Crushed stone',
        unit: 'ton',
        currency: 'usd',
        price: '45',
      })
    expect(listing.status).toBe(201)
    expect(listing.body.data).toMatchObject({
      name: 'Crushed stone',
      providerId,
      categoryId,
    })

    const listed = await request(app)
      .get('/api/v1/listings?page=1&limit=20')
      .set(authHeader(admin.accessToken))
    expect(listed.status).toBe(200)
    expect(listed.body.data.some((row: { id: string }) => row.id === listing.body.data.id)).toBe(
      true,
    )
  })
})
