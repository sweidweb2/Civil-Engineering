import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { getPrisma } from '../../src/database/prisma.js'
import { hashPassword } from '../../src/modules/auth/auth.tokens.js'
import { setStorageServiceForTests, type StorageService } from '../../src/storage/index.js'
import { loadTestConfig } from '../helpers/test-config.js'
import {
  canConnectToDatabase,
  clearUsers,
  disconnectPrisma,
  migrateTestDatabase,
} from '../helpers/test-db.js'

const hasDb = await canConnectToDatabase()

describe.skipIf(!hasDb)('files API (integration)', () => {
  const config = loadTestConfig({
    DATABASE_URL: process.env.DATABASE_URL,
    STORAGE_PROVIDER: 'r2',
    STORAGE_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
    STORAGE_BUCKET: 'civil-bucket',
    STORAGE_ACCESS_KEY: 'test-access',
    STORAGE_SECRET_KEY: 'test-secret',
  })

  const objects = new Map<string, { size: number; contentType: string }>()

  const storage: StorageService = {
    bucket: 'civil-bucket',
    async presignPut({ key, contentType }) {
      objects.set(key, { size: 0, contentType })
      return `https://mock-r2.local/put?key=${encodeURIComponent(key)}`
    },
    async presignGet({ key }) {
      return `https://mock-r2.local/get?key=${encodeURIComponent(key)}`
    },
    async headObject(key) {
      const obj = objects.get(key)
      if (!obj || obj.size <= 0) return null
      return { contentLength: obj.size, contentType: obj.contentType }
    },
    async putObject({ key, body, contentType }) {
      objects.set(key, { size: body.length, contentType })
    },
    async deleteObject(key) {
      objects.delete(key)
    },
  }

  beforeAll(async () => {
    await migrateTestDatabase()
  }, 60_000)

  beforeEach(async () => {
    setStorageServiceForTests(storage)
    await clearUsers()
    objects.clear()
  })

  afterAll(async () => {
    await clearUsers()
    await disconnectPrisma()
    setStorageServiceForTests(null)
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
          create: { firstName: 'File', lastName: 'User', displayName: 'File User' },
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

  it('requires auth for presign', async () => {
    const app = createApp({ config, storage })
    const res = await request(app).post('/api/v1/files/presign').send({
      entityType: 'USER',
      entityId: 'x',
      mime: 'image/jpeg',
      size: 10,
      originalName: 'a.jpg',
    })
    expect(res.status).toBe(401)
  })

  it('presign → simulate upload → complete → download-url → delete', async () => {
    const app = createApp({ config, storage })
    const user = await createUser('files-owner@example.com')
    const token = await login(app, 'files-owner@example.com')

    const declaredSize = 2048
    const presign = await request(app)
      .post('/api/v1/files/presign')
      .set('Authorization', `Bearer ${token}`)
      .send({
        entityType: 'USER',
        entityId: user.id,
        mime: 'image/jpeg',
        size: declaredSize,
        originalName: 'avatar.jpg',
      })

    expect(presign.status).toBe(201)
    expect(presign.body.fileId).toBeTruthy()
    expect(presign.body.key).toContain(`test/users/${user.id}/`)
    expect(presign.body.uploadUrl).toContain('mock-r2.local')

    // Simulate successful R2 PUT
    objects.set(presign.body.key, { size: declaredSize, contentType: 'image/jpeg' })

    const complete = await request(app)
      .post(`/api/v1/files/${presign.body.fileId}/complete`)
      .set('Authorization', `Bearer ${token}`)

    expect(complete.status).toBe(200)
    expect(complete.body.status).toBe('READY')
    expect(complete.body.size).toBe(declaredSize)

    const download = await request(app)
      .get(`/api/v1/files/${presign.body.fileId}/download-url`)
      .set('Authorization', `Bearer ${token}`)

    expect(download.status).toBe(200)
    expect(download.body.downloadUrl).toContain('mock-r2.local')

    const other = await createUser('files-other@example.com')
    const otherToken = await login(app, 'files-other@example.com')
    const forbidden = await request(app)
      .get(`/api/v1/files/${presign.body.fileId}/download-url`)
      .set('Authorization', `Bearer ${otherToken}`)
    expect(forbidden.status).toBe(403)
    void other

    const del = await request(app)
      .delete(`/api/v1/files/${presign.body.fileId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(del.status).toBe(204)

    const prisma = getPrisma()
    const row = await prisma.file.findUnique({ where: { id: presign.body.fileId } })
    expect(row?.status).toBe('DELETED')
  })

  it('rejects invalid MIME on presign', async () => {
    const app = createApp({ config, storage })
    const user = await createUser('files-mime@example.com')
    const token = await login(app, 'files-mime@example.com')

    const res = await request(app)
      .post('/api/v1/files/presign')
      .set('Authorization', `Bearer ${token}`)
      .send({
        entityType: 'USER',
        entityId: user.id,
        mime: 'application/x-msdownload',
        size: 10,
        originalName: 'evil.exe',
      })

    expect(res.status).toBe(400)
  })
})
