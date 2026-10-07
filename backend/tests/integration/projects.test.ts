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

describe.skipIf(!hasDb)('projects API (integration)', () => {
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

  async function createUser(role: 'ADMIN' | 'MANAGER' | 'CLIENT', email: string) {
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

  it('requires auth for projects', async () => {
    const app = createApp({ config })
    const res = await request(app).get('/api/v1/projects')
    expect(res.status).toBe(401)
  })

  it('lets a manager create and read their project', async () => {
    const app = createApp({ config })
    await createUser('MANAGER', 'pm@example.com')
    const token = await login(app, 'pm@example.com')

    const created = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Tower One', code: 'TWR-1', type: 'COMMERCIAL' })

    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({
      name: 'Tower One',
      code: 'TWR-1',
    })

    const projectId = created.body.data.id as string
    const read = await request(app)
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(read.status).toBe(200)
    expect(read.body.data.name).toBe('Tower One')
  })

  it('forbids a different client from reading a private project', async () => {
    const app = createApp({ config })
    const owner = await createUser('MANAGER', 'owner-p@example.com')
    await createUser('CLIENT', 'viewer@example.com')
    const ownerToken = await login(app, 'owner-p@example.com')
    const viewerToken = await login(app, 'viewer@example.com')

    const created = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Private Site' })
    expect(created.status).toBe(201)

    const denied = await request(app)
      .get(`/api/v1/projects/${created.body.data.id}`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(denied.status).toBe(403)

    // owner still owns it
    expect(owner.id).toBeTruthy()
  })

  it('rejects duplicate project codes', async () => {
    const app = createApp({ config })
    await createUser('MANAGER', 'pm-code@example.com')
    const token = await login(app, 'pm-code@example.com')

    const first = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'A', code: 'DUP-1' })
    expect(first.status).toBe(201)

    const second = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'B', code: 'DUP-1' })
    expect(second.status).toBe(409)
    expect(second.body.code).toBe('CODE_IN_USE')
  })

  it('scopes project list to the owner; admin sees all', async () => {
    const app = createApp({ config })
    await createUser('MANAGER', 'owner-list@example.com')
    await createUser('MANAGER', 'other-list@example.com')
    await createUser('ADMIN', 'admin-list@example.com')
    const ownerToken = await login(app, 'owner-list@example.com')
    const otherToken = await login(app, 'other-list@example.com')
    const adminToken = await login(app, 'admin-list@example.com')

    const owned = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Owner Site' })
    expect(owned.status).toBe(201)

    const other = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: 'Other Site' })
    expect(other.status).toBe(201)

    const ownerList = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(ownerList.status).toBe(200)
    expect(ownerList.body.data).toHaveLength(1)
    expect(ownerList.body.data[0].name).toBe('Owner Site')

    const adminList = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(adminList.status).toBe(200)
    expect(adminList.body.data.length).toBeGreaterThanOrEqual(2)
  })
})
