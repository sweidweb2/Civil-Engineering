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

describe.skipIf(!hasDb)('providers API (integration)', () => {
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

  async function createUser(role: 'ADMIN' | 'PROVIDER' | 'CLIENT', email: string) {
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

  it('requires auth for listing providers', async () => {
    const app = createApp({ config })
    const res = await request(app).get('/api/v1/providers')
    expect(res.status).toBe(401)
  })

  it('forbids non-admins from listing and creating providers', async () => {
    const app = createApp({ config })
    const owner = await createUser('PROVIDER', 'owner-list@example.com')
    const token = await login(app, owner.email)

    const list = await request(app).get('/api/v1/providers').set('Authorization', `Bearer ${token}`)
    expect(list.status).toBe(403)

    const create = await request(app)
      .post('/api/v1/providers')
      .set('Authorization', `Bearer ${token}`)
      .send({ ownerUserId: owner.id, name: 'Blocked Co' })
    expect(create.status).toBe(403)
  })

  it('lets an admin create, list, and edit a provider', async () => {
    const app = createApp({ config })
    await createUser('ADMIN', 'admin-prov@example.com')
    const owner = await createUser('PROVIDER', 'owner-prov@example.com')
    const adminToken = await login(app, 'admin-prov@example.com')

    const created = await request(app)
      .post('/api/v1/providers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ownerUserId: owner.id,
        name: 'Steel Works',
        city: 'Beirut',
        country: 'Lebanon',
        phone: '+961 01 555 010',
      })

    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({
      name: 'Steel Works',
      ownerUserId: owner.id,
      status: 'PENDING',
      city: 'Beirut',
    })

    const listed = await request(app)
      .get('/api/v1/providers')
      .query({ page: 1, limit: 20 })
      .set('Authorization', `Bearer ${adminToken}`)

    expect(listed.status).toBe(200)
    expect(listed.body.meta.total).toBe(1)
    expect(listed.body.meta.statusCounts.PENDING).toBe(1)
    expect(listed.body.data[0].name).toBe('Steel Works')

    const updated = await request(app)
      .patch(`/api/v1/providers/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Steel Works LLC', status: 'APPROVED' })

    expect(updated.status).toBe(200)
    expect(updated.body).toMatchObject({ name: 'Steel Works LLC', status: 'APPROVED' })
  })

  it('lets the owner edit contact fields but not status', async () => {
    const app = createApp({ config })
    await createUser('ADMIN', 'admin-owner@example.com')
    const owner = await createUser('PROVIDER', 'owner-edit@example.com')
    const adminToken = await login(app, 'admin-owner@example.com')

    const created = await request(app)
      .post('/api/v1/providers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ownerUserId: owner.id, name: 'Cement Plus' })
    expect(created.status).toBe(201)

    const ownerToken = await login(app, owner.email)
    const patched = await request(app)
      .patch(`/api/v1/providers/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ phone: '+961 01 555 020' })
    expect(patched.status).toBe(200)
    expect(patched.body.phone).toBe('+961 01 555 020')

    const blocked = await request(app)
      .patch(`/api/v1/providers/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'APPROVED' })
    expect(blocked.status).toBe(403)
  })
})
