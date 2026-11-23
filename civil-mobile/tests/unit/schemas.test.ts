import { loginSchema } from '@/features/auth/login.schema'
import { registerSchema } from '@/features/auth/register.schema'
import { en } from '@/i18n/en'
import { colors } from '@/theme/colors'

import { tFrom } from './tStub'

const t = tFrom(en)

describe('loginSchema', () => {
  it('trims email and requires a password', () => {
    expect(loginSchema(t).safeParse({ email: '  a@b.co ', password: 'x' })).toMatchObject({
      success: true,
      data: { email: 'a@b.co' },
    })
    expect(loginSchema(t).safeParse({ email: '', password: '' }).success).toBe(false)
    expect(loginSchema(t).safeParse({ email: 'nope', password: 'x' }).success).toBe(false)
  })
})

describe('registerSchema', () => {
  const base = {
    firstName: 'A',
    lastName: 'B',
    email: 'a@b.co',
    password: 'password1',
    role: 'CLIENT' as const,
  }

  it('accepts a valid registration', () => {
    expect(registerSchema(t).safeParse(base).success).toBe(true)
  })

  it('rejects short passwords', () => {
    expect(registerSchema(t).safeParse({ ...base, password: 'short' }).success).toBe(false)
  })
})

describe('colors', () => {
  it('light and dark palettes define the same tokens', () => {
    expect(Object.keys(colors.dark).sort()).toEqual(Object.keys(colors.light).sort())
  })
})
