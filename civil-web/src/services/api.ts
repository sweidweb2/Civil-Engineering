export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000/api/v1'

export type ApiErrorBody = {
  error?: {
    code?: string
    message?: string
  }
  message?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

/** Bridge so the API client can refresh without importing the Zustand store (cycle-safe). */
export type AuthSessionBridge = {
  getAccessToken: () => string | null | undefined
  getRefreshToken: () => string | null | undefined
  setTokens: (tokens: AuthTokens) => void
  clearSession: () => void
}

let authSession: AuthSessionBridge | null = null
let refreshInFlight: Promise<boolean> | null = null

export function bindAuthSession(bridge: AuthSessionBridge): void {
  authSession = bridge
}

const SKIP_REFRESH_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
])

function shouldSkipRefresh(path: string): boolean {
  const pathname = path.split('?')[0] ?? path
  return SKIP_REFRESH_PATHS.has(pathname)
}

async function exchangeRefreshToken(refreshToken?: string | null): Promise<AuthTokens> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
  })

  const data = (await response.json().catch(() => ({}))) as ApiErrorBody & AuthTokens

  if (!response.ok) {
    const message = data.error?.message || data.message || `Request failed (${response.status})`
    throw new ApiError(response.status, message, data.error?.code)
  }

  if (!data.accessToken || !data.refreshToken) {
    throw new ApiError(500, 'Invalid refresh response')
  }

  return { accessToken: data.accessToken, refreshToken: data.refreshToken }
}

async function tryRefreshSession(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight
  }

  refreshInFlight = (async () => {
    if (!authSession) {
      return false
    }

    try {
      // Prefer in-memory refresh; otherwise rely on httpOnly refresh cookie.
      const tokens = await exchangeRefreshToken(authSession.getRefreshToken())
      authSession.setTokens(tokens)
      return true
    } catch {
      authSession.clearSession()
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

export type ApiRequestOptions = RequestInit & {
  accessToken?: string | null
  /** Skip 401→refresh→retry (auth endpoints and the refresh call itself). */
  skipAuthRefresh?: boolean
  /** Byte progress for multipart uploads. Uses XHR because fetch cannot report it. */
  onUploadProgress?: (percent: number) => void
}

function toHeaderRecord(headers: HeadersInit | undefined): Record<string, string> {
  const record: Record<string, string> = {}
  if (!headers) return record
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      record[key] = value
    })
    return record
  }
  if (Array.isArray(headers)) {
    for (const [key, value] of headers) record[key] = value
    return record
  }
  return { ...record, ...headers }
}

function uploadWithProgress(
  url: string,
  init: {
    method: string
    headers: Record<string, string>
    body: FormData
    onUploadProgress: (percent: number) => void
    signal?: AbortSignal | null
  },
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(init.method, url)
    xhr.withCredentials = true
    xhr.responseType = 'text'
    for (const [key, value] of Object.entries(init.headers)) {
      xhr.setRequestHeader(key, value)
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return
      init.onUploadProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
    }

    xhr.onload = () => {
      const responseHeaders = new Headers()
      for (const line of xhr.getAllResponseHeaders().trim().split(/[\r\n]+/)) {
        if (!line) continue
        const index = line.indexOf(':')
        if (index === -1) continue
        responseHeaders.append(line.slice(0, index).trim(), line.slice(index + 1).trim())
      }
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: responseHeaders,
        }),
      )
    }
    xhr.onerror = () => reject(new ApiError(0, 'Upload failed'))
    xhr.onabort = () => reject(new DOMException('The operation was aborted.', 'AbortError'))

    if (init.signal) {
      if (init.signal.aborted) {
        reject(new DOMException('The operation was aborted.', 'AbortError'))
        return
      }
      init.signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }

    xhr.send(init.body)
  })
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { accessToken, skipAuthRefresh, headers, onUploadProgress, ...rest } = options

  const resolveToken = (override?: string | null) => {
    if (override !== undefined) return override
    return authSession?.getAccessToken() ?? null
  }

  const execute = async (token: string | null) => {
    const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData
    const requestHeaders = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...toHeaderRecord(headers),
    }

    if (onUploadProgress && rest.body instanceof FormData) {
      return uploadWithProgress(`${API_BASE_URL}${path}`, {
        method: (rest.method ?? 'POST').toUpperCase(),
        headers: requestHeaders,
        body: rest.body,
        onUploadProgress,
        signal: rest.signal,
      })
    }

    return fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      credentials: 'include',
      headers: requestHeaders,
    })
  }

  let token = resolveToken(accessToken)
  let response = await execute(token)

  const canRefresh =
    response.status === 401 && !skipAuthRefresh && !shouldSkipRefresh(path) && Boolean(authSession)

  if (canRefresh) {
    const refreshed = await tryRefreshSession()
    if (refreshed) {
      token = authSession?.getAccessToken() ?? null
      response = await execute(token)
    }
  }

  if (response.status === 204) {
    return undefined as T
  }

  const data = (await response.json().catch(() => ({}))) as ApiErrorBody & T

  if (!response.ok) {
    const message = data.error?.message || data.message || `Request failed (${response.status})`
    throw new ApiError(response.status, message, data.error?.code)
  }

  return data as T
}

/** Low-level refresh used by auth service; does not touch session bridge. */
export async function refreshTokens(refreshToken?: string | null): Promise<AuthTokens> {
  return exchangeRefreshToken(refreshToken)
}
