import path from 'node:path'
import { fileURLToPath } from 'node:url'
import EmbeddedPostgres from 'embedded-postgres'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '.embedded-pg')

const PORT = Number(process.env.TEST_PG_PORT ?? 5433)

/**
 * Starts real embedded PostgreSQL for e2e when Docker is unavailable.
 * Prefer Docker: `npm run test:db:up` + DATABASE_URL to compose service.
 */
export async function setup() {
  if (process.env.DATABASE_URL && process.env.SKIP_EMBEDDED_PG === '1') {
    return
  }

  // If Docker Postgres already answers, reuse it
  if (!process.env.FORCE_EMBEDDED_PG) {
    try {
      const { default: pg } = await import('pg')
      const probe = new pg.Pool({
        connectionString:
          process.env.DATABASE_URL ??
          `postgresql://postgres:postgres@127.0.0.1:${PORT}/civil_test`,
        connectionTimeoutMillis: 1500,
      })
      await probe.query('SELECT 1')
      await probe.end()
      process.env.DATABASE_URL =
        process.env.DATABASE_URL ??
        `postgresql://postgres:postgres@127.0.0.1:${PORT}/civil_test`
      return
    } catch {
      // fall through to embedded
    }
  }

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
    await server.stop()
  }
}
