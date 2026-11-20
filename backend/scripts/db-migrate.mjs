/**
 * Safe wrapper around `prisma migrate deploy`.
 *
 * - Prefer DIRECT_URL (direct or session pooler) for CLI DDL
 * - Refuse Supabase transaction pooler (:6543)
 * - Require explicit opt-in for production
 * - Remind operators to migrate every environment
 */
import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function migrateUrl() {
  return process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? ''
}

function parsePort(url) {
  try {
    const normalized = url.replace(/^postgresql:/i, 'http:')
    const { port } = new URL(normalized)
    return port ? Number(port) : 5432
  } catch {
    return null
  }
}

function hostOf(url) {
  try {
    return new URL(url.replace(/^postgresql:/i, 'http:')).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function fail(message) {
  console.error(`\n[db:migrate] ${message}\n`)
  process.exit(1)
}

function warn(message) {
  console.warn(`[db:migrate] WARN: ${message}`)
}

const url = migrateUrl()
if (!url) {
  fail('Set DIRECT_URL (preferred) or DATABASE_URL before migrating.')
}

const port = parsePort(url)
const host = hostOf(url)
const databaseUrl = process.env.DATABASE_URL ?? ''
const directUrl = process.env.DIRECT_URL ?? ''

if (port === 6543 || /[?&]pgbouncer=true/i.test(url)) {
  fail(
    'Migrate URL looks like a transaction pooler (:6543 / pgbouncer=true). ' +
      'Set DIRECT_URL to the direct DB host (db.<ref>.supabase.co:5432) or the session pooler (:5432).',
  )
}

if (!directUrl && /pooler\.supabase\.com/i.test(databaseUrl)) {
  fail(
    'DATABASE_URL is a Supabase pooler URL but DIRECT_URL is unset. ' +
      'prisma.config.ts falls back to DATABASE_URL — set DIRECT_URL to a direct/session connection for DDL.',
  )
}

if (/pooler\.supabase\.com/i.test(host)) {
  warn(
    'Migrating via a pooler host. Prefer DIRECT_URL=postgresql://...@db.<project-ref>.supabase.co:5432/postgres when IPv6/IPv4 add-on allows it.',
  )
}

if ((process.env.NODE_ENV ?? '').toLowerCase() === 'production') {
  if (process.env.ALLOW_PROD_DB_MIGRATE !== '1') {
    fail(
      'Refusing production migrate without ALLOW_PROD_DB_MIGRATE=1. ' +
        'Index builds without CONCURRENTLY take SHARE locks (block writes) until complete — schedule off-peak.',
    )
  }
  warn(
    'Production migrate allowed (ALLOW_PROD_DB_MIGRATE=1). Expect brief write locks on indexed tables.',
  )
}

console.log('[db:migrate] Using migrate URL host:', host || '(unparsed)', `port=${port ?? '?'}`)
console.log(
  '[db:migrate] Reminder: run this against every Supabase project (local/dev, staging, production). Schema drifts if one env is skipped.',
)
console.log(
  '[db:migrate] Note: already-applied index migration cannot be rewritten for CONCURRENTLY; future CREATE INDEX must use CONCURRENTLY (see npm run db:assert-index-safety).',
)

const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  cwd: backendRoot,
  env: process.env,
  encoding: 'utf8',
  shell: true,
  stdio: 'inherit',
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

console.log('[db:migrate] Deploy finished. Optional: npm run db:verify-indexes')
process.exit(0)
