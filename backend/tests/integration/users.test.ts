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
    expect(list.body.meta.total).toBe(2)
    expect(list.body.meta.counts).toMatchObject({
      accounts: 2,
      active: 2,
      managers: 1,
      roles: { ADMIN: 1, MANAGER: 1, CLIENT: 0 },
    })

    const searched = await request(app)
      .get('/api/v1/users')
      .query({ q: 'Pat' })
      .set('Authorization', `Bearer ${token}`)
    expect(searched.status).toBe(200)
    expect(searched.body.data).toHaveLength(1)
    expect(searched.body.data[0].email).toBe('pm@example.com')
    expect(searched.body.meta.total).toBe(1)
    expect(searched.body.meta.counts.accounts).toBe(2)
  })

  it('returns a lean user lookup for admins', async () => {
    const app = createApp({ config })
    await createUser('ADMIN', 'admin-lookup@example.com')
    await createUser('CLIENT', 'client-lookup@example.com')
    const adminToken = await login(app, 'admin-lookup@example.com')
    const clientToken = await login(app, 'client-lookup@example.com')

    const anonymous = await request(app).get('/api/v1/users/lookup')
    expect(anonymous.status).toBe(401)

    const forbidden = await request(app)
      .get('/api/v1/users/lookup')
      .set('Authorization', `Bearer ${clientToken}`)
    expect(forbidden.status).toBe(403)

    const lookup = await request(app)
      .get('/api/v1/users/lookup')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(lookup.status).toBe(200)
    expect(lookup.body.data).toEqual([
      { id: expect.any(String), email: 'admin-lookup@example.com', name: 'ADMIN Test' },
      { id: expect.any(String), email: 'client-lookup@example.com', name: 'CLIENT Test' },
    ])
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
    expect(own.body.meta).toEqual({ avatarDownloadUrl: null })

    const denied = await request(app)
      .get(`/api/v1/users/${other.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(denied.status).toBe(403)
  })

  it('creates, lists, approves, unapproves, and deletes registrations', async () => {
    const app = createApp({ config })
    await createUser('ADMIN', 'admin-approvals@example.com')
    await createUser('CLIENT', 'client-approvals@example.com')
    const adminToken = await login(app, 'admin-approvals@example.com')
    const clientToken = await login(app, 'client-approvals@example.com')

    const forbidden = await request(app)
      .get('/api/v1/users/approvals')
      .set('Authorization', `Bearer ${clientToken}`)
    expect(forbidden.status).toBe(403)

    const created = await request(app)
      .post('/api/v1/users/approvals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'pending.pm@example.com',
        password: 'password1',
        role: 'MANAGER',
        firstName: 'Pending',
        lastName: 'Manager',
      })
    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({
      email: 'pending.pm@example.com',
      role: 'MANAGER',
      status: 'PENDING',
    })

    const blocked = await request(app).post('/api/v1/auth/login').send({
      email: 'pending.pm@example.com',
      password: 'password1',
    })
    expect(blocked.status).toBe(401)
    expect(blocked.body.code).toBe('ACCOUNT_PENDING')

    const pending = await request(app)
      .get('/api/v1/users/approvals?approval=pending')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(pending.status).toBe(200)
    expect(pending.body.data.map((user: { email: string }) => user.email)).toContain(
      'pending.pm@example.com',
    )
    expect(pending.body.meta.counts.pending).toBeGreaterThanOrEqual(1)

    const approved = await request(app)
      .post(`/api/v1/users/${created.body.data.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(approved.status).toBe(200)
    expect(approved.body.data.status).toBe('ACTIVE')

    const signedIn = await request(app).post('/api/v1/auth/login').send({
      email: 'pending.pm@example.com',
      password: 'password1',
    })
    expect(signedIn.status).toBe(200)

    const unapproved = await request(app)
      .post(`/api/v1/users/${created.body.data.id}/unapprove`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(unapproved.status).toBe(200)
    expect(unapproved.body.data.status).toBe('PENDING')

    const removed = await request(app)
      .delete(`/api/v1/users/${created.body.data.id}/approval`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(removed.status).toBe(204)

    const missing = await request(app)
      .get(`/api/v1/users/${created.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(missing.status).toBe(404)
  })

  it('creates, lists, verifies, and deletes a worker verification', async () => {
    const app = createApp({ config })
    await createUser('ADMIN', 'admin-verify@example.com')
    const token = await login(app, 'admin-verify@example.com')

    const created = await request(app)
      .post('/api/v1/users/verifications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'worker.verify@example.com',
        password: 'password1',
        firstName: 'Vera',
        lastName: 'Worker',
      })
    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({
      email: 'worker.verify@example.com',
      role: 'WORKER',
      status: 'PENDING',
      verificationStatus: 'REQUESTED',
      isVerified: false,
    })

    const list = await request(app)
      .get('/api/v1/users/verifications')
      .set('Authorization', `Bearer ${token}`)
    expect(list.status).toBe(200)
    expect(list.body.data.map((user: { email: string }) => user.email)).toContain(
      'worker.verify@example.com',
    )
    expect(list.body.meta.counts.requested).toBeGreaterThanOrEqual(1)

    const verified = await request(app)
      .post(`/api/v1/users/${created.body.data.id}/verification`)
      .set('Authorization', `Bearer ${token}`)
      .send({ verificationStatus: 'VERIFIED' })
    expect(verified.status).toBe(200)
    expect(verified.body.data).toMatchObject({
      verificationStatus: 'VERIFIED',
      isVerified: true,
    })

    const removed = await request(app)
      .delete(`/api/v1/users/${created.body.data.id}/verification`)
      .set('Authorization', `Bearer ${token}`)
    expect(removed.status).toBe(204)
  })
})
