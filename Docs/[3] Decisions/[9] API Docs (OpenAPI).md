# Decision — API Docs (OpenAPI)

**Status:** LOCKED (approach); OpenAPI file still to be written  
**Date:** 2026-09-20  
**Applies to:** public REST `/api/v1` contract; backend modules as live routes

---

## Locked approach

| Piece    | Choice                                                                 |
| -------- | ---------------------------------------------------------------------- |
| Spec     | OpenAPI 3.x (YAML/JSON) — contract for public `/api/v1`                |
| Viewer   | TBD when wired (Swagger UI, Scalar, or Redoc)                          |
| Location | Spec files under `Docs/[3] Decisions/` or beside this decision; optional generate-from-Zod/routes later |

Swagger is tooling that **renders** OpenAPI — not a competing standard.

---

## Source of truth (until the OpenAPI file is written)

- `Docs/[1] Main App/[1] Tech Stack.md` — REST `/api/v1`
- `.cursor/rules/project-core.mdc` — methods, status codes, pagination, errors
- Live routes: `backend/src/routes/v1.ts` + `backend/src/modules/*`

---

## Summary

- Versioned REST under `/api/v1`
- Zod validation at the HTTP edge (`validate` middleware)
- Errors: `{ code, message }` via central error middleware
- Auth: JWT access + refresh (`/api/v1/auth/...`)
