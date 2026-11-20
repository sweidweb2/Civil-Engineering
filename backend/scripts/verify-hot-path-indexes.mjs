/**
 * Confirm expected hot-path indexes exist after migrate deploy.
 * Uses DIRECT_URL ?? DATABASE_URL (same preference as prisma.config.ts).
 */
import 'dotenv/config'
import pg from 'pg'

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!connectionString) {
  console.error('[verify-indexes] Set DIRECT_URL or DATABASE_URL')
  process.exit(1)
}

/** Indexes introduced / retained by 20261120200000_index_coverage_audit + prior hot paths. */
const EXPECTED = [
  'notifications_receiverId_deletedAt_createdAt_idx',
  'notifications_receiverId_isRead_deletedAt_idx',
  'worker_profiles_isPublic_updatedAt_idx',
  'worker_profiles_isPublic_availability_updatedAt_idx',
  'worker_profiles_country_trgm_idx',
  'worker_profiles_headline_trgm_idx',
  'worker_profiles_bio_trgm_idx',
  'providers_status_createdAt_idx',
  'providers_createdAt_idx',
  'providers_email_trgm_idx',
  'providers_city_trgm_idx',
  'projects_ownerId_archivedAt_status_createdAt_idx',
  'projects_archivedAt_status_createdAt_idx',
  'projects_archivedAt_type_createdAt_idx',
  'files_status_updatedAt_idx',
  'files_status_createdAt_idx',
  'reviews_targetType_createdAt_idx',
  'reviews_status_targetType_createdAt_idx',
  'categories_scope_kind_sortOrder_idx',
  'categories_scope_kind_isActive_idx',
  'categories_name_trgm_idx',
  'categories_nameAr_trgm_idx',
  'categories_slug_trgm_idx',
  'listings_categoryId_status_updatedAt_idx',
]

/** Must be gone after the audit migration. */
const MUST_BE_ABSENT = [
  'notifications_receiverId_deletedAt_idx',
  'notifications_createdAt_idx',
  'worker_profiles_availability_isPublic_idx',
  'worker_profiles_city_country_idx',
  'providers_status_idx',
  'providers_city_country_idx',
  'projects_ownerId_idx',
  'projects_startDate_idx',
  'projects_city_country_idx',
  'projects_createdAt_idx',
  'projects_archivedAt_idx',
  'files_status_idx',
  'categories_scope_kind_idx',
  'listings_providerId_idx',
  'listings_categoryId_idx',
  'listings_status_idx',
  'listing_images_listingId_idx',
  'project_images_projectId_idx',
  'registration_attempts_ipAddress_idx',
]

const pool = new pg.Pool({
  connectionString,
  // Supabase pooler / cloud often need TLS; local embedded does not.
  ssl: /supabase\.co|pooler\.supabase\.com/i.test(connectionString)
    ? { rejectUnauthorized: false }
    : undefined,
})

try {
  const { rows } = await pool.query(
    `SELECT indexname
     FROM pg_indexes
     WHERE schemaname = 'public'
       AND indexname = ANY($1::text[])`,
    [[...EXPECTED, ...MUST_BE_ABSENT]],
  )
  const present = new Set(rows.map((r) => r.indexname))

  const missing = EXPECTED.filter((name) => !present.has(name))
  const lingering = MUST_BE_ABSENT.filter((name) => present.has(name))

  if (missing.length || lingering.length) {
    if (missing.length) {
      console.error('[verify-indexes] Missing expected indexes:')
      for (const name of missing) console.error(`  - ${name}`)
    }
    if (lingering.length) {
      console.error('[verify-indexes] Redundant indexes still present (should have been dropped):')
      for (const name of lingering) console.error(`  - ${name}`)
    }
    process.exit(1)
  }

  const { rows: invalid } = await pool.query(
    `SELECT c.relname AS indexname
     FROM pg_index i
     JOIN pg_class c ON c.oid = i.indexrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND NOT i.indisvalid
       AND c.relname = ANY($1::text[])`,
    [EXPECTED],
  )
  if (invalid.length) {
    console.error('[verify-indexes] Invalid indexes (failed concurrent build leftovers):')
    for (const row of invalid) console.error(`  - ${row.indexname}`)
    process.exit(1)
  }

  console.log(
    `[verify-indexes] OK — ${EXPECTED.length} hot-path indexes present, redundants absent.`,
  )
} finally {
  await pool.end()
}
