/**
 * Native cold start: SecureStore answers asynchronously. The gate must stay closed
 * until the saved session is read; opening it on the next microtask (old behaviour)
 * routed a signed-in user to Login for a moment.
 */
jest.mock('@/services/notifications', () => ({ unregisterPushForUser: jest.fn(async () => {}) }))
jest.mock('@/services/users', () => ({ getUser: jest.fn() }))

const mockSaved = JSON.stringify({
  state: {
    user: { id: 'u1', email: 'a@b.co', role: 'MANAGER', isVerified: false, profile: null },
    tokens: { accessToken: 'a', refreshToken: 'r' },
  },
  version: 0,
})

let mockRelease!: () => void
jest.mock('@/stores/authStorage', () => ({
  authStorage: {
    // Resolves only when the test calls mockRelease() — a slow SecureStore read.
    getItem: () => new Promise<string>((resolve) => (mockRelease = () => resolve(mockSaved))),
    setItem: async () => {},
    removeItem: async () => {},
  },
}))

describe('auth hydration gate (native)', () => {
  it('stays closed until SecureStore returns, then restores the session', async () => {
    // jest-expo runs as iOS: Platform.OS !== 'web'.
    // Load after the mocks (module start-up runs the hydration fallbacks).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAuthStore } = require('@/stores/authStore') as typeof import('@/stores/authStore')

    await Promise.resolve() // the old microtask fallback would have fired here
    await new Promise((r) => setTimeout(r, 60)) // and the old 50ms index.tsx timer here
    expect(useAuthStore.getState().isHydrated).toBe(false)

    mockRelease()
    await new Promise((r) => setTimeout(r, 0))
    expect(useAuthStore.getState().isHydrated).toBe(true)
    expect(useAuthStore.getState().user?.id).toBe('u1')
  })
})
