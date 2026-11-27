import { describe, expect, it } from 'vitest'

import {
  upsertDesignBodySchema,
  upsertGeotechnicalBodySchema,
  upsertLicensingBodySchema,
  upsertMaterialsBodySchema,
} from '../../src/modules/project-stages/project-stages.schema.js'

describe('project stage schemas', () => {
  const baseGeo = {
    soilType: 'Sand',
    soilBearingCapacity: '120.25',
    groundwaterLevel: null,
    foundationRecommendation: 'Deep piles',
    reportFilePath: 'dev/PROJECT/p1/report.pdf',
    consultantName: 'Consultant',
    status: 'IN_PROGRESS' as const,
    startDate: '2026-01-01T00:00:00.000Z',
    completionDate: '2026-02-01T00:00:00.000Z',
    notes: 'Notes',
    expectedUpdatedAt: null,
  }

  it('accepts a valid geotechnical payload', () => {
    expect(upsertGeotechnicalBodySchema.safeParse(baseGeo).success).toBe(true)
  })

  it('rejects invalid decimals', () => {
    const result = upsertGeotechnicalBodySchema.safeParse({
      ...baseGeo,
      soilBearingCapacity: '12.12345',
    })
    expect(result.success).toBe(false)
  })

  it('rejects completion before start', () => {
    const result = upsertGeotechnicalBodySchema.safeParse({
      ...baseGeo,
      startDate: '2026-03-01T00:00:00.000Z',
      completionDate: '2026-02-01T00:00:00.000Z',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a partial draft with only status', () => {
    expect(
      upsertDesignBodySchema.safeParse({ status: 'IN_PROGRESS', expectedUpdatedAt: null }).success,
    ).toBe(true)
  })

  it('rejects overlong strings', () => {
    const result = upsertDesignBodySchema.safeParse({
      architecturalDesignPath: 'a'.repeat(501),
      status: 'NOT_STARTED',
      expectedUpdatedAt: null,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = upsertLicensingBodySchema.safeParse({
      status: 'DRAFT',
      expectedUpdatedAt: null,
    })
    expect(result.success).toBe(false)
  })

  it('rejects materials arrival before order', () => {
    const result = upsertMaterialsBodySchema.safeParse({
      orderDate: '2026-02-01T00:00:00.000Z',
      expectedArrivalDate: '2026-01-01T00:00:00.000Z',
      status: 'NOT_STARTED',
      expectedUpdatedAt: null,
    })
    expect(result.success).toBe(false)
  })

  it('accepts blank expectedUpdatedAt as null (first create)', () => {
    const result = upsertGeotechnicalBodySchema.safeParse({
      ...baseGeo,
      expectedUpdatedAt: '',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.expectedUpdatedAt).toBeNull()
  })
})
