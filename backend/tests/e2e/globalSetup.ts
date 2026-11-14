import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import EmbeddedPostgres from 'embedded-postgres'

import { DEFAULT_TEST_DATABASE_URL } from '../helpers/test-db.js'

const PORT = Number(process.env.TEST_PG_PORT ?? 55432)
const dataDir = path.join(os.tmpdir(), `civil-pg-e2e-${process.pid}-${Date.now()}`)

async function canConnect(url: string) {
  const { default: pg } = await import('pg')
  const probe = new pg.Pool({
    connectionString: url,
    connectionTimeoutMillis: 1500,
  })
  try {
    await probe.query('SELECT 1')
    return true
  } finally {
    await probe.end()
  }
}

/**
 * Real Test Postgres for e2e:
 * 1) Reuse `DATABASE_URL` if already reachable
 * 2) Else start embedded-postgres in a temp dir
 */
export async function setup() {
  const url = process.env.DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL

  if (process.env.SKIP_EMBEDDED_PG === '1') {
    process.env.DATABASE_URL = url
    return
  }

  if (!process.env.FORCE_EMBEDDED_PG) {
    try {
      if (await canConnect(url)) {
        process.env.DATABASE_URL = url
        return
      }
    } catch {
      // continue
    }
  }

  fs.mkdirSync(dataDir, { recursive: true })

  const server = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'postgres',
    password: 'postgres',
    port: PORT,
    persistent: false,
  })

  await server.initialise()
  await server.start()
  await server.createDatabase('civil_test')
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${PORT}/civil_test`

  return async () => {
    try {
      await server.stop()
    } catch {
      // ignore
    }
    try {
      fs.rmSync(dataDir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  }
}
