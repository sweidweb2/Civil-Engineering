import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { clearUsers, disconnectPrisma, migrateTestDatabase } from '../helpers/test-db.js'
import { authHeader, createE2EApp, createE2EUser, loginE2E } from './helpers.js'

/**
 * Admin registration-queue journey: list pending managers, approve, then list users.
 */
describe('backend e2e (admin approvals)', () => {
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

  it('lets an admin approve a pending manager and see them as active', async () => {
    const app = createE2EApp()
    await createE2EUser('ADMIN', 'admin-approvals@example.com')
    const pending = await createE2EUser('MANAGER', 'pm.pending-e2e@example.com', {
      status: 'PENDING',
      firstName: 'Omar',
    })

    const admin = await loginE2E(app, 'admin-approvals@example.com')

    const queue = await request(app)
      .get('/api/v1/users/approvals?approval=pending&page=1&limit=20')
      .set(authHeader(admin.accessToken))
    expect(queue.status).toBe(200)
    expect(queue.body.data.some((row: { id: string }) => row.id === pending.id)).toBe(true)

    const approved = await request(app)
      .post(`/api/v1/users/${pending.id}/approve`)
      .set(authHeader(admin.accessToken))
    expect(approved.status).toBe(200)
    expect(approved.body.data.status).toBe('ACTIVE')

    const users = await request(app)
      .get('/api/v1/users?q=pm.pending-e2e&page=1&limit=20')
      .set(authHeader(admin.accessToken))
    expect(users.status).toBe(200)
    const row = users.body.data.find((u: { id: string }) => u.id === pending.id)
    expect(row?.status).toBe('ACTIVE')
    expect(row?.role).toBe('MANAGER')
  })
})
