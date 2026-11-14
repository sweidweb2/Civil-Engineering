// Prisma ORM v7 — connection URL lives here (not in schema.prisma).
import 'dotenv/config'

import { defineConfig } from 'prisma/config'

// Prefer DIRECT_URL for CLI migrate/introspect when DATABASE_URL is a pooler URL.
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
