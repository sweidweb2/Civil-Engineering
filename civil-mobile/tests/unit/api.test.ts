import { ApiError, apiRequest, bindAuthSession } from '@/services/api'

type Session = { access: string; refresh: string; cleared: boolean }

function bind(session: Session) {
  bindAuthSession({
    getAccessToken: () => session.access,
    getRefreshToken: () => session.refresh,
    setTokens: (t) => {
      session.access = t.accessToken
      session.refresh = t.refreshToken
    },
    clearSession: () => {
      session.cleared = true
    },
  })
}

function res(status: number, body?: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => {
      if (body === undefined) throw new Error('no body')
      return body
    },
  } as Response
}

const fetchMock = jest.fn()

beforeEach(() => {
  fetchMock.mockReset()
  globalThis.fetch = fetchMock as unknown as typeof fetch
})

describe('apiRequest', () => {
  it('sends the bearer token and returns parsed JSON', async () => {
    bind({ access: 'a1', refresh: 'r1', cleared: false })
    fetchMock.mockResolvedValueOnce(res(200, { data: 1 }))

    await expect(apiRequest('/users')).resolves.toEqual({ data: 1 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/users$/)
    expect(init.headers.Authorization).toBe('Bearer a1')
  })

  it('returns undefined on 204', async () => {
    bind({ access: 'a1', refresh: 'r1', cleared: false })
    fetchMock.mockResolvedValueOnce(res(204))
    await expect(apiRequest('/x', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('throws ApiError with code and message from the error body', async () => {
    bind({ access: 'a1', refresh: 'r1', cleared: false })
    fetchMock.mockResolvedValueOnce(
      res(422, { error: { code: 'VALIDATION', message: 'Bad input' } }),
    )

    const err = await apiRequest('/x').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 422, code: 'VALIDATION', message: 'Bad input' })
  })

  it('refreshes once on 401 and retries with the new token', async () => {
    const session = { access: 'old', refresh: 'r1', cleared: false }
    bind(session)
    fetchMock
      .mockResolvedValueOnce(res(401, {}))
      .mockResolvedValueOnce(res(200, { accessToken: 'new', refreshToken: 'r2' }))
      .mockResolvedValueOnce(res(200, { ok: true }))

    await expect(apiRequest('/projects')).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/auth\/refresh$/)
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer new')
    expect(session.refresh).toBe('r2')
  })

  it('clears the session and surfaces 401 when refresh fails', async () => {
    const session = { access: 'old', refresh: 'r1', cleared: false }
    bind(session)
    fetchMock
      .mockResolvedValueOnce(res(401, { error: { message: 'Expired' } }))
      .mockResolvedValueOnce(res(401, {}))

    await expect(apiRequest('/projects')).rejects.toMatchObject({ status: 401 })
    expect(session.cleared).toBe(true)
  })

  it('does not attempt a refresh for auth endpoints', async () => {
    bind({ access: 'a', refresh: 'r', cleared: false })
    fetchMock.mockResolvedValueOnce(res(401, { error: { message: 'Invalid credentials' } }))

    await expect(apiRequest('/auth/login', { method: 'POST' })).rejects.toMatchObject({
      status: 401,
      message: 'Invalid credentials',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shares one refresh between concurrent 401s', async () => {
    bind({ access: 'old', refresh: 'r1', cleared: false })
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh')) {
        return res(200, { accessToken: 'new', refreshToken: 'r2' })
      }
      const auth = (init.headers as Record<string, string>).Authorization
      return auth === 'Bearer new' ? res(200, { ok: true }) : res(401, {})
    })

    await Promise.all([apiRequest('/a'), apiRequest('/b')])
    const refreshCalls = fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/auth/refresh'))
    expect(refreshCalls).toHaveLength(1)
  })
})
