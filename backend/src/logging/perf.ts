import { getLogger } from './logger.js'
import {
  getRequestId,
  getRequestStore,
  type RequestAlsStore,
  runWithRequestContext,
  setRequestRoute,
} from './request-als.js'

/** Verbose timing logs — on in development, or when PERF_LOG=true. */
export function isPerfLogEnabled(): boolean {
  if (process.env.PERF_LOG === 'true') return true
  if (process.env.PERF_LOG === 'false') return false
  return process.env.NODE_ENV !== 'production'
}

/** @deprecated Prefer runWithRequestContext — kept for call sites that only need perf fields. */
export function runWithPerfContext<T>(store: RequestAlsStore, fn: () => T): T {
  return runWithRequestContext(store, fn)
}

export function getPerfRequestId(): string | undefined {
  return getRequestId()
}

export function setPerfRoute(route: string): void {
  setRequestRoute(route)
}

export function logPerf(kind: string, message: string, fields: Record<string, unknown> = {}): void {
  if (!isPerfLogEnabled()) return
  const ms = typeof fields.ms === 'number' ? fields.ms : undefined
  const slow = ms != null ? ms >= 200 : Boolean(fields.slow)
  getLogger().info(
    {
      kind: `perf.${kind}`,
      requestId: getRequestId(),
      route: getRequestStore()?.route,
      slow,
      ...fields,
    },
    message,
  )
}

export async function timeAsync<T>(
  kind: string,
  label: string,
  fn: () => Promise<T>,
  fields: Record<string, unknown> = {},
): Promise<T> {
  const started = performance.now()
  try {
    return await fn()
  } finally {
    const ms = Math.round(performance.now() - started)
    logPerf(kind, `${label} ${ms}ms`, { ...fields, ms })
  }
}
