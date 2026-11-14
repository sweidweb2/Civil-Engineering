import type { RequestHandler } from 'express'

import { isPerfLogEnabled, logPerf, runWithPerfContext } from '../logging/perf.js'

/**
 * Request wall-clock timing + Server-Timing header.
 * Correlates with prisma/auth logs via requestId in AsyncLocalStorage.
 */
export const perfTiming: RequestHandler = (req, res, next) => {
  if (!isPerfLogEnabled()) {
    next()
    return
  }

  const requestId = req.requestId
  const started = performance.now()
  const method = req.method
  const url = req.originalUrl || req.url

  logPerf('http', `→ ${method} ${url}`, { method, url, phase: 'start' })

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
    logPerf('http', `← ${method} ${url} ${res.statusCode} ${ms}ms`, {
      method,
      url,
      statusCode: res.statusCode,
      ms,
      phase: 'end',
      slow: ms >= 500,
    })
    return originalEnd(...args)
  }) as typeof res.end

  runWithPerfContext({ requestId, route: url }, () => next())
}

export function pushServerTiming(
  res: { __perfTimings?: string[] } | object,
  name: string,
  ms: number,
): void {
  const target = res as { __perfTimings?: string[] }
  target.__perfTimings?.push(`${name};dur=${Math.round(ms)}`)
}
