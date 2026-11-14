import { type AppConfig, loadConfig, resetConfigCache } from '../../src/config/index.js'

export const TEST_JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-characters'
export const TEST_JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters'

/** Pin JWT secrets on process.env (authenticate middleware reads `loadConfig()`). */
export function ensureTestJwtEnv(): void {
  // Always overwrite — a developer `.env` must not diverge from tokens signed via loadTestConfig.
  process.env.JWT_ACCESS_SECRET = TEST_JWT_ACCESS_SECRET
  process.env.JWT_REFRESH_SECRET = TEST_JWT_REFRESH_SECRET
  resetConfigCache()
}

export function loadTestConfig(overrides: Partial<NodeJS.ProcessEnv> = {}): AppConfig {
  ensureTestJwtEnv()
  return loadConfig({
    NODE_ENV: 'test',
    PORT: '3000',
    CORS_ORIGINS: 'http://localhost:5173',
    TRUST_PROXY: 'false',
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    ...overrides,
  })
}
