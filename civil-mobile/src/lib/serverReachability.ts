import { ApiError } from '@/services/api'

/** Gateway statuses a proxy returns when the API itself cannot be reached. */
const UNREACHABLE_STATUSES = new Set([502, 503, 504])

/**
 * True when the request got no answer from the API itself: offline, timeout, DNS, or a
 * gateway error (502 / 503 / 504). A saved offline copy is better than an error then.
 * Any other `ApiError` is a real answer (403, 404, 500…) and is shown as an error.
 */
export function isServerUnreachable(error: unknown) {
  return !(error instanceof ApiError) || UNREACHABLE_STATUSES.has(error.status)
}
