/** Browser-side timing logs to find slow fetches. On in Vite DEV, or VITE_PERF_LOG=true. */
export function isPerfLogEnabled(): boolean {
  if (import.meta.env.VITE_PERF_LOG === 'true') return true
  if (import.meta.env.VITE_PERF_LOG === 'false') return false
  return Boolean(import.meta.env.DEV)
}

export function perfLog(kind: string, message: string, fields: Record<string, unknown> = {}): void {
  if (!isPerfLogEnabled()) return
  const ms = typeof fields.ms === 'number' ? fields.ms : undefined
  const slow = ms != null && ms >= 500
  const tag = slow ? '[perf:SLOW]' : '[perf]'

  console.info(tag, kind, message, fields)
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
    perfLog(kind, `${label} ${ms}ms`, { ...fields, ms })
  }
}
