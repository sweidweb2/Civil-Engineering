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

  it('rejects overlong strings', () => {
    const result = upsertDesignBodySchema.safeParse({
      architecturalDesignPath: 'a'.repeat(501),
      structuralDesignPath: 'b',
      mepDesignPath: 'c',
      architectName: 'A',
      structuralEngineerName: 'B',
      mepEngineerName: 'C',
      status: 'NOT_STARTED',
      startDate: '2026-01-01',
      completionDate: '2026-02-01',
      notes: 'n',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = upsertLicensingBodySchema.safeParse({
      permitNumber: '1',
      issuingAuthority: 'City',
      applicationDate: '2026-01-01',
      approvalDate: null,
      permitFilePath: 'path',
      status: 'DRAFT',
      expiryDate: null,
      notes: 'n',
    })
    expect(result.success).toBe(false)
  })

  it('rejects materials arrival before order', () => {
    const result = upsertMaterialsBodySchema.safeParse({
      supplierName: 'S',
      materialDescription: 'M',
      quantity: '1',
      unit: 'kg',
      totalCost: '10',
      currency: 'USD',
      originCountry: 'JO',
      orderDate: '2026-02-01T00:00:00.000Z',
      expectedArrivalDate: '2026-01-01T00:00:00.000Z',
      actualArrivalDate: null,
      invoiceFilePath: 'inv',
      status: 'NOT_STARTED',
      notes: 'n',
    })
    expect(result.success).toBe(false)
  })
})
