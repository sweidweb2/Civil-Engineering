# API

**Source of truth**

- [`Docs/[1] Main App/[1] Tech Stack.md`](../../Docs/[1]%20Main%20App/[1]%20Tech%20Stack.md) — REST `/api/v1`
- [`.cursor/rules/project-core.mdc`](../../.cursor/rules/project-core.mdc) — methods, status codes, pagination, errors
- Live routes: `backend/src/routes/v1.ts` + `backend/src/modules/*`

**Summary**

- Versioned REST under `/api/v1`
- Zod validation at the HTTP edge (`validate` middleware)
- Errors: `{ code, message }` via central error middleware
- Auth: JWT access + refresh (`/api/v1/auth/...`)
