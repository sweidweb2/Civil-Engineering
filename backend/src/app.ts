import express from 'express'
import cors from 'cors'
import type { Pool } from 'pg'

export type AppDeps = {
  pool?: Pool
}

export function createApp(deps: AppDeps = {}) {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true })
  })

  app.get('/health/db', async (_req, res) => {
    if (!deps.pool) {
      res.status(503).json({ ok: false, error: 'DB_NOT_CONFIGURED' })
      return
    }

    try {
      const result = await deps.pool.query<{ ok: number }>('SELECT 1::int AS ok')
      res.status(200).json({ ok: true, db: result.rows[0]?.ok === 1 })
    } catch (error) {
      res.status(503).json({
        ok: false,
        error: 'DB_UNAVAILABLE',
        message: error instanceof Error ? error.message : 'unknown',
      })
    }
  })

  return app
}
