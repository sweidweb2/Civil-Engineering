import { describe, expect, it } from 'vitest'

import { scheduleProgress } from '../../src/modules/projects/projects.schedule.js'

describe('scheduleProgress', () => {
  const start = '2026-10-01T00:00:00.000Z'
  const end = '2026-10-11T00:00:00.000Z'

  it('is 0 before the start date', () => {
    expect(scheduleProgress(start, end, new Date('2026-09-30T00:00:00.000Z'))).toBe(0)
  })

  it('is the elapsed share of the start-to-end span', () => {
    expect(scheduleProgress(start, end, new Date('2026-10-06T00:00:00.000Z'))).toBe(50)
  })

  it('is 100 once the end date has passed', () => {
    expect(scheduleProgress(start, end, new Date('2026-10-12T00:00:00.000Z'))).toBe(100)
  })

  it('is 0 when either date is missing', () => {
    expect(scheduleProgress(start, null, new Date('2026-10-06T00:00:00.000Z'))).toBe(0)
    expect(scheduleProgress(null, end, new Date('2026-10-06T00:00:00.000Z'))).toBe(0)
  })
})
