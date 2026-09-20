import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPrisma } from '../../src/database/prisma.js'

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

/** Default matches `docker-compose.test.yml` (host 5433). CI uses 5432 via env. */
export const DEFAULT_TEST_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5433/civil_test'

export function ensureTestDatabaseUrl(): string {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = DEFAULT_TEST_DATABASE_URL
  }
  return process.env.DATABASE_URL
}

export function migrateTestDatabase(): void {
  ensureTestDatabaseUrl()
  execSync('npx prisma migrate deploy', {
    cwd: backendRoot,
    env: process.env,
    stdio: 'pipe',
  })
}

export async function clearUsers(): Promise<void> {
  const prisma = getPrisma()
  await prisma.user.deleteMany()
}

export async function disconnectPrisma(): Promise<void> {
  const globalForPrisma = globalThis as typeof globalThis & {
    prisma?: { $disconnect: () => Promise<void> }
  }
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect()
    delete globalForPrisma.prisma
  }
}

export async function canConnectToDatabase(): Promise<boolean> {
  ensureTestDatabaseUrl()
  try {
    const { default: pg } = await import('pg')
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 2000,
    })
    try {
      await pool.query('SELECT 1')
      return true
    } finally {
      await pool.end()
    }
  } catch {
    return false
  }
}
