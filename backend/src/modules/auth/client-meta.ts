import type { Request } from 'express'

/** Best-effort client IP (honors trust proxy / X-Forwarded-For). */
export function clientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() || null
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]?.trim() || null
  }
  return req.ip || req.socket.remoteAddress || null
}

export function clientUserAgent(req: Request): string | null {
  const ua = req.headers['user-agent']
  if (typeof ua !== 'string') return null
  const trimmed = ua.trim()
  return trimmed ? trimmed.slice(0, 512) : null
}
