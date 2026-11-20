/**
 * Fail CI / local checks when a *new* migration creates indexes without CONCURRENTLY.
 *
 * Only migrations newer than `20261120200000_index_coverage_audit` are checked.
 * That audit migration already applied with blocking CREATE INDEX and must not be rewritten
 * (Prisma checksum). Older history is grandfathered.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = path.join(backendRoot, 'prisma', 'migrations')

/** Lexicographic floor: only folders strictly after this name are enforced. */
const ENFORCE_AFTER = '20261120200000_index_coverage_audit'

const CREATE_INDEX_RE = /^\s*CREATE\s+(?:UNIQUE\s+)?INDEX\b/i
const CONCURRENTLY_RE = /\bCONCURRENTLY\b/i

function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '')
}

function listMigrationFolders() {
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
}

const offenders = []

for (const folder of listMigrationFolders()) {
  if (folder <= ENFORCE_AFTER) continue

  const sqlPath = path.join(migrationsDir, folder, 'migration.sql')
  if (!fs.existsSync(sqlPath)) continue

  const sql = stripSqlComments(fs.readFileSync(sqlPath, 'utf8'))
  const statements = sql
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean)

  for (const statement of statements) {
    if (!CREATE_INDEX_RE.test(statement)) continue
    if (CONCURRENTLY_RE.test(statement)) continue
    offenders.push({ folder, preview: statement.split(/\s+/).slice(0, 12).join(' ').slice(0, 120) })
  }
}

if (offenders.length > 0) {
  console.error(
    '[assert-index-safety] Blocking CREATE INDEX in migrations after ' +
      `${ENFORCE_AFTER} (use CREATE INDEX CONCURRENTLY):\n`,
  )
  for (const row of offenders) {
    console.error(`  - ${row.folder}: ${row.preview}`)
  }
  console.error(
    '\nNote: CREATE INDEX CONCURRENTLY cannot run inside a transaction. ' +
      'Keep concurrent index builds in their own migration and ensure the runner does not wrap them in BEGIN/COMMIT.\n',
  )
  process.exit(1)
}

console.log(`[assert-index-safety] OK — no unsafe CREATE INDEX after ${ENFORCE_AFTER}.`)
