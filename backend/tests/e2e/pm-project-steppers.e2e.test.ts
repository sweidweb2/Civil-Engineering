import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { getPrisma } from '../../src/database/prisma.js'
import { clearUsers, disconnectPrisma, migrateTestDatabase } from '../helpers/test-db.js'
import { authHeader, createE2EApp, createE2EUser, loginE2E } from './helpers.js'

/**
 * End-to-end PM journey (latest steppers feature):
 * SUPER catalogs input types → PM builds step templates → project creation clones
 * templates → PM fills values and adds a project-only input.
 */
describe('backend e2e (pm project steppers)', () => {
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

  it('runs the full step template → project stepper → values flow', async () => {
    const app = createE2EApp()
    await createE2EUser('SUPER', 'super-steppers@example.com')
    await createE2EUser('MANAGER', 'pm-steppers@example.com')

    const superSession = await loginE2E(app, 'super-steppers@example.com')
    const pmSession = await loginE2E(app, 'pm-steppers@example.com')

    const inputType = await request(app)
      .post('/api/v1/input-types')
      .set(authHeader(superSession.accessToken))
      .send({ code: 'TEXT', label: 'Text', status: 'ACTIVE', sortOrder: 10 })
    expect(inputType.status).toBe(201)
    const inputTypeId = inputType.body.data.id as string

    const numberType = await request(app)
      .post('/api/v1/input-types')
      .set(authHeader(superSession.accessToken))
      .send({ code: 'NUMBER', label: 'Number', status: 'ACTIVE', sortOrder: 20 })
    expect(numberType.status).toBe(201)
    const numberTypeId = numberType.body.data.id as string

    const step = await request(app)
      .post('/api/v1/steps')
      .set(authHeader(pmSession.accessToken))
      .send({ name: 'Site prep', status: 'ACTIVE' })
    expect(step.status).toBe(201)
    const stepId = step.body.data.id as string

    const stepInput = await request(app)
      .post(`/api/v1/steps/${stepId}/inputs`)
      .set(authHeader(pmSession.accessToken))
      .send({ label: 'Notes', inputTypeId })
    expect(stepInput.status).toBe(201)

    const project = await request(app)
      .post('/api/v1/projects')
      .set(authHeader(pmSession.accessToken))
      .send({ name: 'Harbor Works', code: 'HRB-E2E', type: 'INFRASTRUCTURE' })
    expect(project.status).toBe(201)
    const projectId = project.body.data.id as string

    const steppers = await request(app)
      .get(`/api/v1/projects/${projectId}/steppers`)
      .set(authHeader(pmSession.accessToken))
    expect(steppers.status).toBe(200)
    expect(steppers.body.data).toHaveLength(1)
    expect(steppers.body.data[0]).toMatchObject({
      name: 'Site prep',
      inputCount: 1,
      filledCount: 0,
      isComplete: false,
    })

    const projectStepId = steppers.body.data[0].id as string
    const detail = await request(app)
      .get(`/api/v1/projects/${projectId}/steppers/${projectStepId}`)
      .set(authHeader(pmSession.accessToken))
    expect(detail.status).toBe(200)
    expect(detail.body.data.inputs).toHaveLength(1)
    const clonedInputId = detail.body.data.inputs[0].id as string

    const saved = await request(app)
      .put(`/api/v1/projects/${projectId}/steppers/${projectStepId}/values`)
      .set(authHeader(pmSession.accessToken))
      .send({ values: [{ id: clonedInputId, value: 'Clear vegetation' }] })
    expect(saved.status).toBe(200)
    expect(saved.body.data.inputs[0].value).toBe('Clear vegetation')

    const added = await request(app)
      .post(`/api/v1/projects/${projectId}/steppers/${projectStepId}/inputs`)
      .set(authHeader(pmSession.accessToken))
      .send({ label: 'Area m2', inputTypeId: numberTypeId, value: 120 })
    expect(added.status).toBe(201)
    expect(added.body.data).toMatchObject({
      label: 'Area m2',
      inputTypeCode: 'NUMBER',
      value: 120,
      isProjectOnly: true,
    })

    const listedAgain = await request(app)
      .get(`/api/v1/projects/${projectId}/steppers`)
      .set(authHeader(pmSession.accessToken))
    expect(listedAgain.status).toBe(200)
    expect(listedAgain.body.data[0]).toMatchObject({
      inputCount: 2,
      filledCount: 2,
      isComplete: true,
    })

    // Ensure Prisma still sees the cloned rows (not only the HTTP DTO).
    const prisma = getPrisma()
    const dbCount = await prisma.stepperProject.count({ where: { projectId } })
    expect(dbCount).toBe(1)
  })
})
