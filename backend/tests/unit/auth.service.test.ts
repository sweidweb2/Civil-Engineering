import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthRepository, AuthUserRecord } from '../../src/modules/auth/auth.repository.js'
import { createAuthService } from '../../src/modules/auth/auth.service.js'
import { loadTestConfig } from '../helpers/test-config.js'

vi.mock('../../src/modules/auth/auth.tokens.js', () => ({
  hashPassword: vi.fn(async (password: string) => `hash:${password}`),
  verifyPassword: vi.fn(
    async (password: string, passwordHash: string) => passwordHash === `hash:${password}`,
  ),
  signAccessToken: vi.fn(() => 'access-token'),
  signRefreshToken: vi.fn(() => 'refresh-token'),
  refreshTtlSeconds: vi.fn(() => 3600),
  verifyRefreshToken: vi.fn((_config: unknown, token: string) => {
    if (token === 'bad') throw new Error('invalid')
    return { sub: 'user-1', role: 'CLIENT', typ: 'refresh' as const, jti: 'jti-1', exp: 9999999999 }
  }),
}))

function makeUser(overrides: Partial<AuthUserRecord> = {}): AuthUserRecord {
  return {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: 'hash:secret123',
    role: 'CLIENT',
    status: 'ACTIVE',
    isVerified: false,
    profile: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      displayName: 'Ada Lovelace',
    },
    ...overrides,
  }
}

describe('auth.service', () => {
  const config = loadTestConfig()
  let repository: AuthRepository

  beforeEach(() => {
    repository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      findPrincipalById: vi.fn(),
      createUserWithProfile: vi.fn(),
      updatePasswordHash: vi.fn(),
      denyRefreshJti: vi.fn(async () => undefined),
      claimRefreshJti: vi.fn(async () => 'claimed' as const),
      isRefreshJtiDenied: vi.fn(async () => false),
      purgeExpiredDeniedRefreshTokens: vi.fn(async () => 0),
    }
  })

  it('registers a new user and returns tokens', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(null)
    vi.mocked(repository.createUserWithProfile).mockResolvedValue(makeUser())

    const service = createAuthService(repository, config)
    const result = await service.register({
      email: 'user@example.com',
      password: 'secret123',
      firstName: 'Ada',
      lastName: 'Lovelace',
    })

    expect(result.user.email).toBe('user@example.com')
    expect(result.user.role).toBe('CLIENT')
    expect(result.user.isVerified).toBe(false)
    expect(result.tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })
    expect(repository.createUserWithProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        role: 'CLIENT',
      }),
    )
  })

  it('rejects duplicate email on register', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(makeUser())
    const service = createAuthService(repository, config)

    await expect(
      service.register({
        email: 'user@example.com',
        password: 'secret123',
      }),
    ).rejects.toMatchObject({ status: 409, code: 'CONFLICT' })
  })

  it('logs in with valid credentials', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(makeUser())
    const service = createAuthService(repository, config)

    const result = await service.login({
      email: 'user@example.com',
      password: 'secret123',
    })

    expect(result.user.id).toBe('user-1')
    expect(result.tokens.accessToken).toBe('access-token')
  })

  it('rejects login with wrong password', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(makeUser())
    const service = createAuthService(repository, config)

    await expect(
      service.login({ email: 'user@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' })
  })

  it('rejects login for pending users after the password matches', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(
      makeUser({ status: 'PENDING', role: 'WORKER' }),
    )
    const service = createAuthService(repository, config)

    await expect(
      service.login({ email: 'user@example.com', password: 'secret123' }),
    ).rejects.toMatchObject({ status: 401, code: 'ACCOUNT_PENDING' })
  })

  it('rejects login for inactive users', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(makeUser({ status: 'INACTIVE' }))
    const service = createAuthService(repository, config)

    await expect(
      service.login({ email: 'user@example.com', password: 'secret123' }),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('refreshes tokens for an active user and rotates the old refresh jti', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeUser())
    const service = createAuthService(repository, config)

    const tokens = await service.refreshTokens({ refreshToken: 'good' })
    expect(tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })
    expect(repository.claimRefreshJti).toHaveBeenCalledWith('jti-1', expect.any(Date))
  })

  it('rejects invalid refresh tokens', async () => {
    const service = createAuthService(repository, config)

    await expect(service.refreshTokens({ refreshToken: 'bad' })).rejects.toMatchObject({
      status: 401,
    })
  })

  it('logout resolves without error', async () => {
    const service = createAuthService(repository, config)
    await expect(service.logout({ refreshToken: 'anything' })).resolves.toBeUndefined()
  })

  it('rejects concurrent refresh reuse of the same jti', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeUser())
    vi.mocked(repository.claimRefreshJti).mockResolvedValue('reuse')
    const service = createAuthService(repository, config)

    await expect(service.refreshTokens({ refreshToken: 'good' })).rejects.toMatchObject({
      status: 401,
    })
    expect(repository.claimRefreshJti).toHaveBeenCalled()
  })

  it('logout denylists the refresh jti', async () => {
    const service = createAuthService(repository, config)
    await service.logout({ refreshToken: 'good' })
    expect(repository.denyRefreshJti).toHaveBeenCalledWith('jti-1', expect.any(Date))
  })

  it('changes password when current password is correct', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeUser())
    vi.mocked(repository.updatePasswordHash).mockResolvedValue(undefined)
    const service = createAuthService(repository, config)

    await expect(
      service.changePassword('user-1', {
        currentPassword: 'secret123',
        newPassword: 'newsecret1',
        confirmPassword: 'newsecret1',
      }),
    ).resolves.toBeUndefined()

    expect(repository.updatePasswordHash).toHaveBeenCalledWith('user-1', 'hash:newsecret1')
  })

  it('rejects change password when current password is wrong', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeUser())
    const service = createAuthService(repository, config)

    await expect(
      service.changePassword('user-1', {
        currentPassword: 'wrong',
        newPassword: 'newsecret1',
        confirmPassword: 'newsecret1',
      }),
    ).rejects.toMatchObject({ status: 401 })
    expect(repository.updatePasswordHash).not.toHaveBeenCalled()
  })
})
