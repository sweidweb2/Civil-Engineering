import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { Pool } from 'pg'
import { createApp } from '../../src/app.js'

/**
 * Backend E2E against real Test PostgreSQL.
 * Start DB: npm run test:db:up
 * Default URL: postgresql://postgres:postgres@127.0.0.1:55432/civil_test (embedded)
 * Docker compose URL: postgresql://postgres:postgres@127.0.0.1:5433/civil_test
 */
const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:55432/civil_test'

describe('backend e2e (postgres)', () => {
  let pool: Pool

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL })
    // Fail fast if Test Postgres is down
    await pool.query('SELECT 1')
  })

  afterAll(async () => {
    await pool.end()
  })

  it('connects to Test PostgreSQL', async () => {
    const result = await pool.query<{ n: number }>('SELECT 1::int AS n')
    expect(result.rows[0]?.n).toBe(1)
  })

  it('GET /health works', async () => {
    const app = createApp({ pool })
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('GET /health/db talks to Postgres', async () => {
    const app = createApp({ pool })
    const res = await request(app).get('/health/db')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, db: true })
  })
})
