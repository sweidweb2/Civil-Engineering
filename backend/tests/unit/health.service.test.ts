import { describe, expect, it, vi } from 'vitest'

import { loadConfig } from '../../src/config/index.js'
import type { HealthRepository } from '../../src/modules/health/health.repository.js'
import { createHealthService } from '../../src/modules/health/health.service.js'

const testConfig = loadConfig({
  NODE_ENV: 'test',
  PORT: '3000',
  CORS_ORIGINS: 'http://localhost:5173',
  TRUST_PROXY: 'false',
})

describe('health.service', () => {
  it('returns ok for liveness', () => {
    const repository: HealthRepository = { ping: vi.fn() }
    const service = createHealthService(repository, testConfig)
    expect(service.getHealth()).toEqual({ ok: true })
  })

  it('returns db ok when ping succeeds', async () => {
    const repository: HealthRepository = {
      ping: vi.fn().mockResolvedValue(true),
    }
    const service = createHealthService(repository, testConfig)
    await expect(service.getDbHealth()).resolves.toEqual({ ok: true, db: true })
  })

  it('throws when ping fails', async () => {
    const repository: HealthRepository = {
      ping: vi.fn().mockResolvedValue(false),
    }
    const service = createHealthService(repository, testConfig)
    await expect(service.getDbHealth()).rejects.toMatchObject({
      status: 503,
      code: 'DB_UNAVAILABLE',
    })
  })
})
