import type { RequestHandler } from 'express'

import { isPerfLogEnabled, logPerf } from '../logging/perf.js'
import { getRequestStore, setRequestRoute } from '../logging/request-als.js'

/**
 * Request wall-clock timing + Server-Timing header.
 * Correlates with prisma/auth logs via requestId in AsyncLocalStorage
 * (opened by `requestContext`, always — not only when perf logs are on).
 */
export const perfTiming: RequestHandler = (req, res, next) => {
  const url = req.originalUrl || req.url
  setRequestRoute(url)

  if (!isPerfLogEnabled()) {
    next()
    return
  }

  // CORS preflight — keep Server-Timing quiet; no access noise
  if (req.method.toUpperCase() === 'OPTIONS') {
    next()
    return
  }

  const started = performance.now()
  const method = req.method

  const timings: string[] = []
  ;(res as { __perfTimings?: string[] }).__perfTimings = timings

  const originalEnd = res.end.bind(res)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirror Express res.end overloads
  res.end = ((...args: any[]) => {
    const ms = Math.round(performance.now() - started)
    const parts = [`total;dur=${ms}`, ...timings]
    try {
      res.setHeader('Server-Timing', parts.join(', '))
      res.setHeader('X-Response-Time-Ms', String(ms))
    } catch {
      // headers may already be sent
    }
    // One HTTP line per request (no start+end pair, no duplicate pino-http line)
    logPerf('http', `${method} ${url} ${res.statusCode} ${ms}ms`, {
      method,
      url,
      statusCode: res.statusCode,
      ms,
      slow: ms >= 500,
      requestId: getRequestStore()?.requestId,
    })
    return originalEnd(...args)
  }) as typeof res.end

  next()
}

export function pushServerTiming(
  res: { __perfTimings?: string[] } | object,
  name: string,
  ms: number,
): void {
  const target = res as { __perfTimings?: string[] }
  target.__perfTimings?.push(`${name};dur=${Math.round(ms)}`)
}
