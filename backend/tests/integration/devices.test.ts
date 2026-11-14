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

describe.skipIf(!hasDb)('devices API (integration)', () => {
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

  async function createUser(email: string) {
    const prisma = getPrisma()
    return prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword('password1'),
        role: 'CLIENT',
        status: 'ACTIVE',
        profile: {
          create: { firstName: 'Device', lastName: 'User', displayName: 'Device User' },
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

  it('requires auth to register a device', async () => {
    const app = createApp({ config })
    const res = await request(app)
      .post('/api/v1/devices')
      .send({ token: 'expo-token-1', platform: 'ANDROID' })
    expect(res.status).toBe(401)
  })

  it('registers and unregisters a device token for the signed-in user', async () => {
    const app = createApp({ config })
    await createUser('device-user@example.com')
    const token = await login(app, 'device-user@example.com')

    const registered = await request(app)
      .post('/api/v1/devices')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: 'expo-token-1', platform: 'ANDROID' })
    expect(registered.status).toBe(201)
    expect(registered.body).toMatchObject({ token: 'expo-token-1', platform: 'ANDROID' })

    const again = await request(app)
      .post('/api/v1/devices')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: 'expo-token-1', platform: 'IOS' })
    expect(again.status).toBe(201)
    expect(again.body.platform).toBe('IOS')

    const removed = await request(app)
      .delete('/api/v1/devices')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: 'expo-token-1' })
    expect(removed.status).toBe(204)

    const prisma = getPrisma()
    const left = await prisma.deviceToken.count()
    expect(left).toBe(0)
  })
})
