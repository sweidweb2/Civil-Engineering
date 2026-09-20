import { Pool } from 'pg'
import request from 'supertest'
import { afterAll,beforeAll, describe, expect, it } from 'vitest'

import { createApp } from '../../src/app.js'
import { loadConfig } from '../../src/config/index.js'

/**
 * Backend E2E against real Test PostgreSQL.
 * Start DB: npm run test:db:up
 * Default URL: postgresql://postgres:postgres@127.0.0.1:55432/civil_test (embedded)
 * Docker compose URL: postgresql://postgres:postgres@127.0.0.1:5433/civil_test
 */
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:55432/civil_test'

const config = loadConfig({
  NODE_ENV: 'test',
  PORT: '3000',
  CORS_ORIGINS: 'http://localhost:5173',
  TRUST_PROXY: 'false',
  DATABASE_URL,
})

describe('backend e2e (postgres)', () => {
  let pool: Pool

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL })
    await pool.query('SELECT 1')
  })

  afterAll(async () => {
    await pool.end()
  })

  it('connects to Test PostgreSQL', async () => {
    const result = await pool.query<{ n: number }>('SELECT 1::int AS n')
    expect(result.rows[0]?.n).toBe(1)
  })

  it('GET /api/v1/health works', async () => {
    const app = createApp({ config, pool })
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('GET /api/v1/health/db talks to Postgres', async () => {
    const app = createApp({ config, pool })
    const res = await request(app).get('/api/v1/health/db')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, db: true })
  })
})
