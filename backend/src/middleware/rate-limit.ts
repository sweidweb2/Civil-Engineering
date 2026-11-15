import type { RequestHandler } from 'express'
import rateLimit from 'express-rate-limit'

import type { AppConfig } from '../config/index.js'
import { ErrorCodes } from '../errors/error-codes.js'

const rateLimitHandler: RequestHandler = (_req, res) => {
  res.status(429).json({
    code: ErrorCodes.RATE_LIMITED,
    message: 'Too many requests',
  })
}

/**
 * In-process rate limit (express-rate-limit memory store).
 * Fine for a single API instance; multi-instance later → edge (Nginx/CDN) or a shared store.
 */
export function createApiRateLimiter(config: AppConfig) {
  return rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) =>
      config.env === 'test' ||
      req.path === '/api/v1/health' ||
      req.path.startsWith('/api/v1/health/'),
    handler: rateLimitHandler,
  })
}

/** Stricter limiter for login / refresh / logout (brute-force resistance). */
export function createAuthRateLimiter(config: AppConfig) {
  return rateLimit({
    windowMs: config.authRateLimitWindowMs,
    limit: config.authRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => config.env === 'test',
    handler: rateLimitHandler,
  })
}

/** Register-specific limiter (IP window) — device lifetime cap is enforced in the auth service. */
export function createRegisterRateLimiter(config: AppConfig) {
  return rateLimit({
    windowMs: config.authRateLimitWindowMs,
    limit: config.authRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => config.env === 'test',
    handler: rateLimitHandler,
  })
}
