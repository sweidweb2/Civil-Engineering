import { AsyncLocalStorage } from 'node:async_hooks'

import { getLogger } from './logger.js'

type PerfStore = {
  requestId?: string
  route?: string
}

const perfAls = new AsyncLocalStorage<PerfStore>()

/** Verbose timing logs — on in development, or when PERF_LOG=true. */
export function isPerfLogEnabled(): boolean {
  if (process.env.PERF_LOG === 'true') return true
  if (process.env.PERF_LOG === 'false') return false
  return process.env.NODE_ENV !== 'production'
}

export function runWithPerfContext<T>(store: PerfStore, fn: () => T): T {
  return perfAls.run(store, fn)
}

export function getPerfRequestId(): string | undefined {
  return perfAls.getStore()?.requestId
}

export function setPerfRoute(route: string): void {
  const store = perfAls.getStore()
  if (store) store.route = route
}

export function logPerf(kind: string, message: string, fields: Record<string, unknown> = {}): void {
  if (!isPerfLogEnabled()) return
  const ms = typeof fields.ms === 'number' ? fields.ms : undefined
  const slow = ms != null ? ms >= 200 : Boolean(fields.slow)
  getLogger().info(
    {
      kind: `perf.${kind}`,
      requestId: getPerfRequestId(),
      route: perfAls.getStore()?.route,
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
