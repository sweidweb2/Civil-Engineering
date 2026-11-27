import { validateHoursInput } from '@/services/project-productivity'

describe('validateHoursInput', () => {
  it('accepts 0–24 with at most one decimal place', () => {
    expect(validateHoursInput('0')).toBeNull()
    expect(validateHoursInput('8')).toBeNull()
    expect(validateHoursInput('8.5')).toBeNull()
    expect(validateHoursInput('24')).toBeNull()
    expect(validateHoursInput('24.0')).toBeNull()
  })

  it('rejects empty, negative, over 24, or extra decimals', () => {
    expect(validateHoursInput('')).toBe('required')
    expect(validateHoursInput('  ')).toBe('required')
    expect(validateHoursInput('-1')).toBe('range')
    expect(validateHoursInput('8.55')).toBe('format')
    expect(validateHoursInput('24.1')).toBe('range')
    expect(validateHoursInput('25')).toBe('range')
  })

  it('rejects leading zeros that the API would reject', () => {
    expect(validateHoursInput('08')).toBe('format')
    expect(validateHoursInput('08.5')).toBe('format')
  })
})
