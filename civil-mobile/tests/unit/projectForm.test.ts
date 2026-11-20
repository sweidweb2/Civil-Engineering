import { toApiDate } from '@/features/pm/projectForm'

describe('toApiDate', () => {
  it('turns a calendar day into an ISO datetime the projects API accepts', () => {
    expect(toApiDate('2026-11-20')).toBe('2026-11-20T00:00:00.000Z')
  })

  it('maps blank to null so the date is cleared', () => {
    expect(toApiDate('  ')).toBeNull()
  })
})
