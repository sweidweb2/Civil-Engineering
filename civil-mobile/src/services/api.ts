import Constants from 'expo-constants'
import { Platform } from 'react-native'

import i18n from '@/i18n'
import { isOffline } from '@/services/connectivity'

/**
 * Dev API host must be the machine running the backend — not `localhost` on a
 * physical device/emulator. Prefer Metro's LAN host so IP churn does not break login.
 */
function resolveApiBaseUrl(): string {
  const fromEnv = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '')

  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri
    const metroHost =
      typeof hostUri === 'string' && hostUri.length > 0 ? hostUri.split(':')[0] : undefined

    if (metroHost && metroHost !== 'localhost' && metroHost !== '127.0.0.1') {
      return `http://${metroHost}:3000/api/v1`
    }

    // Android emulator loopback to the host machine
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000/api/v1'
    }
  }

  return fromEnv || 'http://localhost:3000/api/v1'
}

const API_BASE_URL = resolveApiBaseUrl()

export type ApiErrorBody = {
  code?: string
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

/** Default budget for API calls so hung backends cannot stall the UI forever. */
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000

function shouldSkipRefresh(path: string): boolean {
  const pathname = path.split('?')[0] ?? path
  return SKIP_REFRESH_PATHS.has(pathname)
}

/** Abort after `ms` — works even when `AbortSignal.timeout` is missing (older RN). */
export function createTimeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    return AbortSignal.timeout(ms)
  }
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}

/** Merge caller abort with a timeout so either can cancel the request. */
function withRequestTimeout(timeoutMs: number, signal?: AbortSignal | null): AbortSignal {
  const timeout = createTimeoutSignal(timeoutMs)
  if (!signal) return timeout
  if (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal) {
    return AbortSignal.any([timeout, signal])
  }
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  if (signal.aborted || timeout.aborted) {
    controller.abort()
    return controller.signal
  }
  signal.addEventListener('abort', onAbort, { once: true })
  timeout.addEventListener('abort', onAbort, { once: true })
  return controller.signal
}

async function exchangeRefreshToken(refreshToken: string): Promise<AuthTokens> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    signal: createTimeoutSignal(DEFAULT_REQUEST_TIMEOUT_MS),
  })

  const data = (await response.json().catch(() => ({}))) as ApiErrorBody & AuthTokens

  if (!response.ok) {
    const message = data.error?.message || data.message || `Request failed (${response.status})`
    throw new ApiError(response.status, message, data.error?.code ?? data.code)
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
    const refreshToken = authSession?.getRefreshToken()
    if (!refreshToken || !authSession) {
      return false
    }

    try {
      const tokens = await exchangeRefreshToken(refreshToken)
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
  /** Override the default request timeout (ms). */
  timeoutMs?: number
  /**
   * Sent as `Idempotency-Key` on create calls. Reuse the same key when retrying the
   * same submission so a create that succeeded server-side is not duplicated.
   */
  idempotencyKey?: string
}

/** Error code for writes attempted with no network (handled like any ApiError). */
export const OFFLINE_ERROR_CODE = 'OFFLINE'

/** Default budget for multipart uploads — aligned with R2 server timeout. */
export const UPLOAD_REQUEST_TIMEOUT_MS = 60_000

/** Apply refreshed session tokens through the bound auth bridge (if any). */
export function applySessionTokens(tokens: AuthTokens): void {
  authSession?.setTokens(tokens)
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { accessToken, skipAuthRefresh, headers, timeoutMs, idempotencyKey, ...rest } = options

  // Writes are online-only: fail fast with a clear message instead of a timeout.
  const method = (rest.method ?? 'GET').toUpperCase()
  if (method !== 'GET' && method !== 'HEAD' && isOffline()) {
    throw new ApiError(0, i18n.t('offline.writeBlocked'), OFFLINE_ERROR_CODE)
  }

  const resolveToken = (override?: string | null) => {
    if (override !== undefined) return override
    return authSession?.getAccessToken() ?? null
  }

  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData
  const resolvedTimeoutMs =
    timeoutMs ?? (isFormData ? UPLOAD_REQUEST_TIMEOUT_MS : DEFAULT_REQUEST_TIMEOUT_MS)

  const requestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `m-${Date.now().toString(36)}`

  const execute = async (token: string | null) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      // Bearer + SecureStore only. RN Android still may jar cookies; backend allows
      // cookie+no-Origin for native. Omit reduces cookie replay when the runtime honors it.
      credentials: 'omit',
      signal: withRequestTimeout(resolvedTimeoutMs, rest.signal),
      headers: {
        // Multipart bodies must not carry a JSON content type: fetch has to set
        // `multipart/form-data; boundary=…` itself.
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-request-id': requestId,
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        ...(headers as Record<string, string> | undefined),
      },
    })
    return response
  }

  let token = resolveToken(accessToken)
  let response = await execute(token)

  const canRefresh =
    response.status === 401 &&
    !skipAuthRefresh &&
    !shouldSkipRefresh(path) &&
    Boolean(authSession?.getRefreshToken())

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
    throw new ApiError(response.status, message, data.error?.code ?? data.code)
  }

  return data as T
}

/** Low-level refresh used by auth service; does not touch session bridge. */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  return exchangeRefreshToken(refreshToken)
}
