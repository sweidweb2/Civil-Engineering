import { describe, expect, it } from 'vitest'

import {
  geotechnicalMissing,
  isDesignComplete,
  isGeotechnicalComplete,
  isLicensingComplete,
  isMaintenanceComplete,
  isMaterialsComplete,
} from '../../src/modules/project-stages/project-stages.completeness.js'

describe('project stage completeness', () => {
  it('marks geotechnical complete only when required fields are filled', () => {
    expect(
      isGeotechnicalComplete({
        soilType: 'Clay',
        soilBearingCapacity: '150.5',
        foundationRecommendation: 'Raft',
        reportFilePath: 'env/project/p1/report.pdf',
        consultantName: 'Dr. A',
        startDate: '2026-01-01T00:00:00.000Z',
        completionDate: '2026-02-01T00:00:00.000Z',
      }),
    ).toBe(true)

    expect(
      geotechnicalMissing({
        soilType: '',
        soilBearingCapacity: '150.5',
        foundationRecommendation: 'Raft',
        reportFilePath: 'env/project/p1/report.pdf',
        consultantName: 'Dr. A',
        startDate: '2026-01-01T00:00:00.000Z',
        completionDate: '2026-02-01T00:00:00.000Z',
      }),
    ).toContain('soilType')
  })

  it('marks licensing complete without optional approval/expiry dates', () => {
    expect(
      isLicensingComplete({
        permitNumber: 'P-1',
        issuingAuthority: 'Municipality',
        applicationDate: '2026-01-01T00:00:00.000Z',
        permitFilePath: 'env/project/p1/permit.pdf',
      }),
    ).toBe(true)
  })

  it('requires design paths and engineer names', () => {
    expect(
      isDesignComplete({
        architecturalDesignPath: 'a',
        structuralDesignPath: 'b',
        mepDesignPath: 'c',
        architectName: 'A',
        structuralEngineerName: 'B',
        mepEngineerName: 'C',
        startDate: '2026-01-01T00:00:00.000Z',
        completionDate: '2026-03-01T00:00:00.000Z',
      }),
    ).toBe(true)
  })

  it('requires materials procurement core fields', () => {
    expect(
      isMaterialsComplete({
        supplierName: 'Supply Co',
        materialDescription: 'Steel',
        quantity: '10',
        unit: 'ton',
        totalCost: '1000',
        currency: 'USD',
        originCountry: 'TR',
        orderDate: '2026-01-01T00:00:00.000Z',
        expectedArrivalDate: '2026-02-01T00:00:00.000Z',
        invoiceFilePath: 'env/project/p1/invoice.pdf',
      }),
    ).toBe(true)
  })

  it('requires maintenance core fields', () => {
    expect(
      isMaintenanceComplete({
        maintenanceType: 'Annual',
        description: 'Inspect',
        responsiblePerson: 'Ali',
        scheduledDate: '2026-06-01T00:00:00.000Z',
        cost: '250',
        reportFilePath: 'env/project/p1/maint.pdf',
      }),
    ).toBe(true)
  })
})
