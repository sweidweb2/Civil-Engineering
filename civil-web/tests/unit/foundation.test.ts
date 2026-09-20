import { describe, expect, it } from 'vitest'

import { loginSchema } from '@/features/auth/login.schema'
import { parseForm } from '@/lib/form'
import { hasAnyRole, hasRole } from '@/lib/permissions'

describe('parseForm', () => {
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

describe('permissions', () => {
  it('checks single and any roles', () => {
    expect(hasRole('ADMIN', 'ADMIN')).toBe(true)
    expect(hasRole('CLIENT', 'ADMIN')).toBe(false)
    expect(hasAnyRole('MANAGER', ['ADMIN', 'MANAGER'])).toBe(true)
    expect(hasRole(null, 'ADMIN')).toBe(false)
  })
})
