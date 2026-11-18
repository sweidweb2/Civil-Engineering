import { describe, expect, it } from 'vitest'

import { upsertWorkerProfileBodySchema } from '../../src/modules/workers/workers.schema.js'

const fullBody = {
  headline: null,
  bio: null,
  primaryTrade: null,
  yearsExperience: null,
  languages: null,
  city: null,
  country: null,
  hourlyRate: null,
  dailyRate: null,
  currency: null,
  availability: 'AVAILABLE' as const,
  isPublic: false,
  cvUrl: null,
  experiences: [] as unknown[],
  education: [] as unknown[],
  certifications: [] as unknown[],
  skills: [] as unknown[],
  expectedUpdatedAt: null,
}

describe('upsertWorkerProfileBodySchema', () => {
  it('rejects a partial body so children cannot be wiped by omission', () => {
    const result = upsertWorkerProfileBodySchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('accepts a full empty CV create payload', () => {
    const parsed = upsertWorkerProfileBodySchema.parse(fullBody)
    expect(parsed).toMatchObject({
      availability: 'AVAILABLE',
      isPublic: false,
      experiences: [],
      expectedUpdatedAt: null,
    })
  })

  it('accepts a full worker CV payload', () => {
    const parsed = upsertWorkerProfileBodySchema.parse({
      ...fullBody,
      headline: 'Steel fixer',
      primaryTrade: 'Rebar',
      yearsExperience: 8,
      city: 'Beirut',
      country: 'Lebanon',
      hourlyRate: '12.5',
      currency: 'USD',
      availability: 'AVAILABLE',
      isPublic: true,
      expectedUpdatedAt: '2026-11-18T00:00:00.000Z',
      experiences: [
        {
          company: 'BuildCo',
          roleTitle: 'Foreman',
          startDate: '2020-01-01',
          isCurrent: true,
          endDate: null,
        },
      ],
      skills: [{ categoryId: 'cat-1', level: 'EXPERT' }],
    })
    expect(parsed.experiences).toHaveLength(1)
    expect(parsed.skills[0]?.level).toBe('EXPERT')
    expect(parsed.expectedUpdatedAt).toBe('2026-11-18T00:00:00.000Z')
  })

  it('rejects current experience with an end date', () => {
    const result = upsertWorkerProfileBodySchema.safeParse({
      ...fullBody,
      experiences: [
        {
          company: 'BuildCo',
          roleTitle: 'Foreman',
          isCurrent: true,
          endDate: '2024-01-01',
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects duplicate skill categories', () => {
    const result = upsertWorkerProfileBodySchema.safeParse({
      ...fullBody,
      skills: [
        { categoryId: 'cat-1', level: 'BASIC' },
        { categoryId: 'cat-1', level: 'EXPERT' },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('requires currency when a rate is set', () => {
    const result = upsertWorkerProfileBodySchema.safeParse({
      ...fullBody,
      hourlyRate: '10',
      currency: null,
    })
    expect(result.success).toBe(false)
  })

  it('rejects more than one current experience', () => {
    const result = upsertWorkerProfileBodySchema.safeParse({
      ...fullBody,
      experiences: [
        {
          company: 'A',
          roleTitle: 'One',
          isCurrent: true,
          endDate: null,
        },
        {
          company: 'B',
          roleTitle: 'Two',
          isCurrent: true,
          endDate: null,
        },
      ],
    })
    expect(result.success).toBe(false)
  })
})
