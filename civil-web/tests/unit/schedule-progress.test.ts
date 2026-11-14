import { describe, expect, it } from 'vitest'

import { scheduleProgress } from '@/features/projects/lib/schedule-progress'

describe('scheduleProgress', () => {
  const start = '2026-01-01T00:00:00.000Z'
  const end = '2026-01-11T00:00:00.000Z'

  it('returns 0 when dates are missing or invalid', () => {
    expect(scheduleProgress(null, end)).toBe(0)
    expect(scheduleProgress(start, null)).toBe(0)
    expect(scheduleProgress(end, start)).toBe(0)
  })

  it('returns 0 before start and 100 after end', () => {
    expect(scheduleProgress(start, end, new Date('2025-12-31T00:00:00.000Z'))).toBe(0)
    expect(scheduleProgress(start, end, new Date('2026-01-11T00:00:00.000Z'))).toBe(100)
    expect(scheduleProgress(start, end, new Date('2026-02-01T00:00:00.000Z'))).toBe(100)
  })

  it('returns the elapsed share between start and end', () => {
    expect(scheduleProgress(start, end, new Date('2026-01-06T00:00:00.000Z'))).toBe(50)
  })
})
