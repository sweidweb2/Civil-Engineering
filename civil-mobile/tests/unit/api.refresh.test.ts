import { ApiError, apiRequest, type AuthTokens, bindAuthSession } from '@/services/api'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('apiRequest refresh', () => {
  const tokens: AuthTokens = {
    accessToken: 'access-old',
    refreshToken: 'refresh-1',
  }
  let sessionTokens: AuthTokens | null = { ...tokens }
  const setTokens = jest.fn((next: AuthTokens) => {
    sessionTokens = next
  })
  const clearSession = jest.fn(() => {
    sessionTokens = null
  })

  beforeEach(() => {
    sessionTokens = { ...tokens }
    setTokens.mockClear()
    clearSession.mockClear()
    bindAuthSession({
      getAccessToken: () => sessionTokens?.accessToken,
      getRefreshToken: () => sessionTokens?.refreshToken,
      setTokens,
      clearSession,
    })
    globalThis.fetch = jest.fn() as typeof fetch
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('refreshes once on 401 and retries with the new access token', async () => {
    const fetchMock = globalThis.fetch as jest.Mock
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'expired' } }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: 'access-new',
          refreshToken: 'refresh-2',
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }))

    const result = await apiRequest<{ ok: boolean }>('/activity-logs?page=1')

    expect(result).toEqual({ ok: true })
    expect(setTokens).toHaveBeenCalledWith({
      accessToken: 'access-new',
      refreshToken: 'refresh-2',
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const retryHeaders = fetchMock.mock.calls[2]?.[1]?.headers as Record<string, string>
    expect(retryHeaders.Authorization).toBe('Bearer access-new')
  })

  it('clears the session when refresh fails', async () => {
    const fetchMock = globalThis.fetch as jest.Mock
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'expired' } }, 401))
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'bad refresh' } }, 401))

    await expect(apiRequest('/activity-logs')).rejects.toBeInstanceOf(ApiError)
    expect(clearSession).toHaveBeenCalled()
  })

  it('does not refresh auth endpoints', async () => {
    const fetchMock = globalThis.fetch as jest.Mock
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { message: 'nope' } }, 401))

    await expect(apiRequest('/auth/login', { method: 'POST' })).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(clearSession).not.toHaveBeenCalled()
  })
})
