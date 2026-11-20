import { createIdempotencyKeyFor } from '@/lib/idempotency'
import { ApiError, apiRequest, OFFLINE_ERROR_CODE } from '@/services/api'
import { setOffline } from '@/services/connectivity'

function okResponse() {
  return new Response(JSON.stringify({ data: { id: 'x' } }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('apiRequest offline guard', () => {
  const fetchMock = jest.fn()
  beforeEach(() => {
    fetchMock.mockReset().mockImplementation(async () => okResponse())
    global.fetch = fetchMock as unknown as typeof fetch
  })
  afterEach(() => setOffline(false))

  it('fails writes immediately while offline, without a network call', async () => {
    setOffline(true)
    const error = (await apiRequest('/listings', { method: 'POST', body: '{}' }).catch(
      (e: unknown) => e,
    )) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe(OFFLINE_ERROR_CODE)
    expect(error.message).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still attempts reads while offline (they may fall back to saved data)', async () => {
    setOffline(true)
    await apiRequest('/projects')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sends the Idempotency-Key header when given', async () => {
    await apiRequest('/projects', { method: 'POST', body: '{}', idempotencyKey: 'key-12345678' })
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBe('key-12345678')
  })
})

describe('createIdempotencyKeyFor', () => {
  it('reuses the key for a retry of the same body and makes a new one after an edit', () => {
    const keyFor = createIdempotencyKeyFor()
    const first = keyFor({ name: 'Tower A' })
    expect(keyFor({ name: 'Tower A' })).toBe(first)
    const edited = keyFor({ name: 'Tower B' })
    expect(edited).not.toBe(first)
    expect(edited).toMatch(/^[A-Za-z0-9_-]{8,128}$/)
  })
})
