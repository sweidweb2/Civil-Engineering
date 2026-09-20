# Database

**Source of truth**

- [`Docs/[1] Main App/[1] Tech Stack.md`](../../Docs/[1]%20Main%20App/[1]%20Tech%20Stack.md) — PostgreSQL + Prisma
- [`.cursor/rules/project-core.mdc`](../../.cursor/rules/project-core.mdc) / [`backend.mdc`](../../.cursor/rules/backend.mdc) — repository-only Prisma
- Schema: `backend/prisma/schema.prisma`
- Config: `backend/prisma.config.ts`
- Client: `backend/src/database/`

**Summary**

- PostgreSQL is the system of record
- Prisma Migrate for schema changes — no manual prod replay as source of truth
- Domain models may still be TBD while the schema is designed; sections are organized by domain in the Prisma schema
