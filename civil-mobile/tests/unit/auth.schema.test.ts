import { loginSchema } from '@/features/auth/login.schema'
import { registerSchema } from '@/features/auth/register.schema'
import { ar } from '@/i18n/ar'
import { en } from '@/i18n/en'

import { tFrom } from './tStub'

const t = tFrom(en)

describe('loginSchema', () => {
  it('accepts a valid email and password', () => {
    const result = loginSchema(t).safeParse({
      email: 'user@example.com',
      password: 'secret',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty or invalid email', () => {
    expect(loginSchema(t).safeParse({ email: '', password: 'x' }).success).toBe(false)
    expect(loginSchema(t).safeParse({ email: 'bad', password: 'x' }).success).toBe(false)
  })

  it('rejects empty password', () => {
    expect(loginSchema(t).safeParse({ email: 'user@example.com', password: '' }).success).toBe(
      false,
    )
  })

  it('returns Arabic validation messages when using the ar catalog', () => {
    const result = loginSchema(tFrom(ar)).safeParse({ email: '', password: 'x' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('البريد الإلكتروني مطلوب')
    }
  })
})

describe('registerSchema', () => {
  it('accepts a valid registration payload', () => {
    const result = registerSchema(t).safeParse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'password1',
      role: 'WORKER',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.role).toBe('WORKER')
  })

  it('requires password of at least 8 characters', () => {
    const result = registerSchema(t).safeParse({
      firstName: '',
      lastName: '',
      email: 'ada@example.com',
      password: 'short',
      role: 'CLIENT',
    })
    expect(result.success).toBe(false)
  })

  it('requires a register role', () => {
    const result = registerSchema(t).safeParse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'password1',
    })
    expect(result.success).toBe(false)
  })
})
