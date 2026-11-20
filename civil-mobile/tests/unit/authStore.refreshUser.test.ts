import { remoteCacheGet, remoteCacheInvalidate, remoteCacheSet } from '@/lib/remoteCache'
import { ApiError } from '@/services/api'
import type { AuthUser } from '@/services/auth'
import { getUser, type User } from '@/services/users'
import { useAuthStore, USER_SYNC_INTERVAL_MS } from '@/stores/authStore'

jest.mock('@/services/notifications', () => ({ unregisterPushForUser: jest.fn(async () => {}) }))
jest.mock('@/services/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(async () => {}),
}))
jest.mock('@/services/users', () => ({ getUser: jest.fn() }))
jest.mock('@/stores/authStorage', () => {
  const mem = new Map<string, string>()
  return {
    authStorage: {
      getItem: async (k: string) => mem.get(k) ?? null,
      setItem: async (k: string, v: string) => void mem.set(k, v),
      removeItem: async (k: string) => void mem.delete(k),
    },
  }
})

const mockedGetUser = getUser as jest.MockedFunction<typeof getUser>

const stored: AuthUser = {
  id: 'u1',
  email: 'pm@example.com',
  role: 'MANAGER',
  status: 'ACTIVE',
  isVerified: false,
  profile: { firstName: 'Sam', lastName: 'Lee', displayName: null },
}

function server(overrides: Partial<User> = {}): { data: User; meta: { avatarDownloadUrl: null } } {
  return {
    data: {
      ...stored,
      status: 'ACTIVE',
      profile: { ...stored.profile!, phone: null, avatarUrl: null },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ...overrides,
    } as User,
    meta: { avatarDownloadUrl: null },
  }
}

function signIn() {
  useAuthStore.setState({
    user: stored,
    tokens: { accessToken: 'a', refreshToken: 'r' },
    lastUserSyncAt: 0,
  })
}

describe('authStore.refreshUser', () => {
  beforeEach(() => {
    mockedGetUser.mockReset()
    remoteCacheInvalidate()
    signIn()
  })

  it('applies a role change from the server and drops the old portal cache', async () => {
    remoteCacheSet('dashboard:pm', { stale: true })
    mockedGetUser.mockResolvedValue(server({ role: 'ADMIN' }))
    await useAuthStore.getState().refreshUser()
    expect(useAuthStore.getState().user?.role).toBe('ADMIN')
    expect(remoteCacheGet('dashboard:pm')).toBeUndefined()
  })

  it('updates names without wiping the cache when the role is unchanged', async () => {
    remoteCacheSet('dashboard:pm', { ok: true })
    mockedGetUser.mockResolvedValue(
      server({ profile: { ...server().data.profile!, displayName: 'Sam L.' } }),
    )
    await useAuthStore.getState().refreshUser()
    expect(useAuthStore.getState().user?.profile?.displayName).toBe('Sam L.')
    expect(remoteCacheGet('dashboard:pm')).toEqual({ ok: true })
  })

  it('stores only the session summary fields (no phone / avatar)', async () => {
    mockedGetUser.mockResolvedValue(server({ role: 'WORKER' }))
    await useAuthStore.getState().refreshUser()
    expect(useAuthStore.getState().user?.profile).toEqual({
      firstName: 'Sam',
      lastName: 'Lee',
      displayName: null,
    })
  })

  it('is throttled, unless forced', async () => {
    mockedGetUser.mockResolvedValue(server())
    await useAuthStore.getState().refreshUser()
    await useAuthStore.getState().refreshUser()
    expect(mockedGetUser).toHaveBeenCalledTimes(1)
    await useAuthStore.getState().refreshUser({ force: true })
    expect(mockedGetUser).toHaveBeenCalledTimes(2)
    expect(USER_SYNC_INTERVAL_MS).toBeGreaterThan(0)
  })

  it('logs out when the account no longer exists (404)', async () => {
    mockedGetUser.mockRejectedValue(new ApiError(404, 'User not found'))
    await useAuthStore.getState().refreshUser()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().tokens).toBeNull()
  })

  it('keeps the session on a network error and retries next time', async () => {
    mockedGetUser.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(server())
    await useAuthStore.getState().refreshUser()
    expect(useAuthStore.getState().user).toEqual(stored)
    await useAuthStore.getState().refreshUser() // not throttled after a failure
    expect(mockedGetUser).toHaveBeenCalledTimes(2)
  })

  it('ignores a response that arrives after the user switched accounts', async () => {
    let resolve!: (v: ReturnType<typeof server>) => void
    mockedGetUser.mockReturnValue(new Promise((r) => (resolve = r)))
    const pending = useAuthStore.getState().refreshUser()
    remoteCacheInvalidate() // logout + new login
    useAuthStore.setState({ user: { ...stored, id: 'u2', email: 'b@example.com' } })
    resolve(server({ role: 'ADMIN' }))
    await pending
    expect(useAuthStore.getState().user?.id).toBe('u2')
    expect(useAuthStore.getState().user?.role).toBe('MANAGER')
  })
})
