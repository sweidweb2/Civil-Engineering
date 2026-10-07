import { describe, expect, it } from 'vitest'

import { loginSchema } from '@/features/auth/login.schema'
import { registerSchema } from '@/features/auth/register.schema'
import { parseForm } from '@/lib/form'

describe('loginSchema', () => {
  it('requires email and password', () => {
    const result = parseForm(loginSchema, { email: '', password: '' })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.fieldErrors.email).toBeTruthy()
    expect(result.fieldErrors.password).toBeTruthy()
  })

  it('rejects an invalid email', () => {
    const result = parseForm(loginSchema, { email: 'not-an-email', password: 'password1' })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.fieldErrors.email).toBeTruthy()
  })

  it('accepts a valid login payload', () => {
    const result = parseForm(loginSchema, {
      email: ' admin@example.com ',
      password: 'password1',
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.email).toBe('admin@example.com')
  })
})

describe('registerSchema', () => {
  it('requires a strong enough password', () => {
    const result = parseForm(registerSchema, {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.fieldErrors.password).toBeTruthy()
  })

  it('accepts a valid registration payload', () => {
    const result = parseForm(registerSchema, {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: ' ada@example.com ',
      password: 'password1',
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.email).toBe('ada@example.com')
  })
})
