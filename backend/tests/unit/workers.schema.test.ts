import { describe, expect, it } from 'vitest'

import { upsertWorkerProfileBodySchema } from '../../src/modules/workers/workers.schema.js'

describe('upsertWorkerProfileBodySchema', () => {
  it('defaults missing fields so PUT fully replaces', () => {
    const parsed = upsertWorkerProfileBodySchema.parse({})
    expect(parsed).toMatchObject({
      headline: null,
      availability: 'AVAILABLE',
      isPublic: false,
      experiences: [],
      education: [],
      certifications: [],
      skills: [],
    })
  })

  it('accepts a full worker CV payload', () => {
    const parsed = upsertWorkerProfileBodySchema.parse({
      headline: 'Steel fixer',
      primaryTrade: 'Rebar',
      yearsExperience: 8,
      city: 'Beirut',
      country: 'Lebanon',
      hourlyRate: '12.5',
      currency: 'USD',
      availability: 'AVAILABLE',
      isPublic: true,
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
  })

  it('rejects current experience with an end date', () => {
    const result = upsertWorkerProfileBodySchema.safeParse({
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
      skills: [
        { categoryId: 'cat-1', level: 'BASIC' },
        { categoryId: 'cat-1', level: 'EXPERT' },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('requires currency when a rate is set', () => {
    const result = upsertWorkerProfileBodySchema.safeParse({
      hourlyRate: '10',
      currency: null,
    })
    expect(result.success).toBe(false)
  })

  it('rejects more than one current experience', () => {
    const result = upsertWorkerProfileBodySchema.safeParse({
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
