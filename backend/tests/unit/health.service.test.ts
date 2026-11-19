import { describe, expect, it, vi } from 'vitest'

import { createHealthService } from '../../src/modules/health/health.service.js'

describe('health.service', () => {
  it('returns ok for liveness', () => {
    const service = createHealthService()
    expect(service.getHealth()).toEqual({ ok: true })
  })

  it('returns db ok when ping succeeds', async () => {
    const service = createHealthService({
      ping: vi.fn().mockResolvedValue(true),
    })
    await expect(service.getDbHealth()).resolves.toEqual({ ok: true, db: true })
  })

  it('throws when ping fails', async () => {
    const service = createHealthService({
      ping: vi.fn().mockResolvedValue(false),
    })
    await expect(service.getDbHealth()).rejects.toMatchObject({
      status: 503,
      code: 'DB_UNAVAILABLE',
    })
  })
})
