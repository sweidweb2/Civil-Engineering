import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sqlPath = path.join(
  __dirname,
  '../prisma/migrations/20261118200000_worker_profiles/migration.sql',
)
const sql = fs.readFileSync(sqlPath, 'utf8')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 30_000,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  const client = await pool.connect()
  try {
    const existing = await client.query(
      `select to_regclass('public.worker_profiles') as table_name`,
    )
    if (existing.rows[0]?.table_name) {
      console.log('worker_profiles already exists — skipping SQL')
      return
    }

    console.log('Applying worker_profiles migration SQL…')
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('COMMIT')
    console.log('SQL applied. Mark the migration applied with:')
    console.log('  npx prisma migrate resolve --applied 20261118200000_worker_profiles')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error.message ?? error)
  process.exit(1)
})
