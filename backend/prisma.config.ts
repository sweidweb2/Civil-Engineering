// Prisma ORM v7 — connection URL lives here (not in schema.prisma).
import 'dotenv/config'

import { defineConfig } from 'prisma/config'

// CLI migrate/introspect must NOT use the transaction pooler (:6543 / pgbouncer=true).
// Prefer DIRECT_URL = direct host (db.<ref>.supabase.co:5432) or session pooler (:5432).
// App runtime keeps DATABASE_URL (session or transaction pooler) via the pg adapter.
// Use `npm run db:migrate` (scripts/db-migrate.mjs) — it refuses unsafe migrate URLs.
const databaseUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:5432/civil'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
})
