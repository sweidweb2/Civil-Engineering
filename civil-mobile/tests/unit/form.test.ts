import { z } from 'zod'

import { parseForm } from '@/lib/form'

describe('parseForm (mobile)', () => {
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  })

  it('returns field errors for invalid input', () => {
    const result = parseForm(loginSchema, { email: 'bad', password: '' })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.fieldErrors.email).toBeTruthy()
    expect(result.fieldErrors.password).toBeTruthy()
  })

  it('returns data for valid input', () => {
    const result = parseForm(loginSchema, {
      email: 'user@example.com',
      password: 'secret',
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.email).toBe('user@example.com')
  })
})
