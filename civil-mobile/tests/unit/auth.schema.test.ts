import { loginSchema } from '@/features/auth/login.schema'
import { registerSchema } from '@/features/auth/register.schema'

describe('loginSchema', () => {
  it('accepts a valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'secret',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty or invalid email', () => {
    expect(loginSchema.safeParse({ email: '', password: 'x' }).success).toBe(false)
    expect(loginSchema.safeParse({ email: 'bad', password: 'x' }).success).toBe(false)
  })

  it('rejects empty password', () => {
    expect(loginSchema.safeParse({ email: 'user@example.com', password: '' }).success).toBe(false)
  })
})

describe('registerSchema', () => {
  it('accepts a valid registration payload', () => {
    const result = registerSchema.safeParse({
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
    const result = registerSchema.safeParse({
      firstName: '',
      lastName: '',
      email: 'ada@example.com',
      password: 'short',
      role: 'CLIENT',
    })
    expect(result.success).toBe(false)
  })

  it('requires a register role', () => {
    const result = registerSchema.safeParse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'password1',
    })
    expect(result.success).toBe(false)
  })
})
