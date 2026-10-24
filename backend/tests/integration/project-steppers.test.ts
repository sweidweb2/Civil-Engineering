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

describe.skipIf(!hasDb)('project steppers API (integration)', () => {
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

  async function seedTemplateAndProject(app: ReturnType<typeof createApp>, pmEmail: string) {
    const prisma = getPrisma()
    await createUser('MANAGER', pmEmail)
    const token = await login(app, pmEmail)
    const inputType = await prisma.inputType.create({
      data: { code: 'TEXT', label: 'Text', status: 'ACTIVE', sortOrder: 10 },
    })
    const numberType = await prisma.inputType.create({
      data: { code: 'NUMBER', label: 'Number', status: 'ACTIVE', sortOrder: 20 },
    })

    const step = await request(app)
      .post('/api/v1/steps')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Site prep', status: 'ACTIVE' })
    expect(step.status).toBe(201)

    const stepInput = await request(app)
      .post(`/api/v1/steps/${step.body.data.id}/inputs`)
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Notes', inputTypeId: inputType.id })
    expect(stepInput.status).toBe(201)

    const project = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bridge Works', code: `BRG-${Date.now()}`, type: 'INFRASTRUCTURE' })
    expect(project.status).toBe(201)

    return {
      token,
      projectId: project.body.data.id as string,
      inputTypeId: inputType.id,
      numberTypeId: numberType.id,
    }
  }

  it('requires auth for steppers', async () => {
    const app = createApp({ config })
    const res = await request(app).get('/api/v1/projects/proj-1/steppers')
    expect(res.status).toBe(401)
  })

  it('forbids a non-owner from reading steppers', async () => {
    const app = createApp({ config })
    const { projectId } = await seedTemplateAndProject(app, 'owner-step@example.com')
    await createUser('CLIENT', 'viewer-step@example.com')
    const viewerToken = await login(app, 'viewer-step@example.com')

    const denied = await request(app)
      .get(`/api/v1/projects/${projectId}/steppers`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(denied.status).toBe(403)
  })

  it('lists cloned steppers and saves / adds / deletes inputs', async () => {
    const app = createApp({ config })
    const { token, projectId, numberTypeId } = await seedTemplateAndProject(
      app,
      'pm-step-int@example.com',
    )

    const listed = await request(app)
      .get(`/api/v1/projects/${projectId}/steppers`)
      .set('Authorization', `Bearer ${token}`)
    expect(listed.status).toBe(200)
    expect(listed.body.data).toHaveLength(1)
    expect(listed.body.data[0]).toMatchObject({
      name: 'Site prep',
      inputCount: 1,
      filledCount: 0,
      isComplete: false,
    })

    const projectStepId = listed.body.data[0].id as string
    const detail = await request(app)
      .get(`/api/v1/projects/${projectId}/steppers/${projectStepId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(detail.status).toBe(200)
    const clonedInputId = detail.body.data.inputs[0].id as string

    const saved = await request(app)
      .put(`/api/v1/projects/${projectId}/steppers/${projectStepId}/values`)
      .set('Authorization', `Bearer ${token}`)
      .send({ values: [{ id: clonedInputId, value: 'Cleared' }] })
    expect(saved.status).toBe(200)
    expect(saved.body.data.inputs[0].value).toBe('Cleared')

    const invalid = await request(app)
      .put(`/api/v1/projects/${projectId}/steppers/${projectStepId}/values`)
      .set('Authorization', `Bearer ${token}`)
      .send({ values: [{ id: clonedInputId, value: 99 }] })
    expect(invalid.status).toBe(400)

    const added = await request(app)
      .post(`/api/v1/projects/${projectId}/steppers/${projectStepId}/inputs`)
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Area', inputTypeId: numberTypeId, value: 40 })
    expect(added.status).toBe(201)
    expect(added.body.data).toMatchObject({
      label: 'Area',
      inputTypeCode: 'NUMBER',
      value: 40,
      isProjectOnly: true,
    })
    const addedId = added.body.data.id as string

    const removed = await request(app)
      .delete(`/api/v1/projects/${projectId}/steppers/${projectStepId}/inputs/${addedId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(removed.status).toBe(204)

    const afterDelete = await request(app)
      .get(`/api/v1/projects/${projectId}/steppers/${projectStepId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(afterDelete.status).toBe(200)
    expect(afterDelete.body.data.inputs).toHaveLength(1)
    expect(afterDelete.body.data.inputs[0].id).toBe(clonedInputId)
  })
})
