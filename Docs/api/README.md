# API docs

**Locked approach:** [OpenAPI 3.x](https://spec.openapis.org/oas/latest.html)

| Piece | Choice |
| --- | --- |
| Spec | OpenAPI 3.x (YAML/JSON) — contract for public `/api/v1` |
| Viewer | TBD when wired (Swagger UI, Scalar, or Redoc) |
| Location | Spec files under `Docs/api/` for now; optional generate-from-Zod/routes later |

Swagger is tooling that **renders** OpenAPI — not a competing standard.

---

**Source of truth (until the OpenAPI file is written)**

- [`Docs/[1] Main App/[1] Tech Stack.md`](../[1]%20Main%20App/[1]%20Tech%20Stack.md) — REST `/api/v1`
- [`.cursor/rules/project-core.mdc`](../../.cursor/rules/project-core.mdc) — methods, status codes, pagination, errors
- Live routes: `backend/src/routes/v1.ts` + `backend/src/modules/*`

**Summary**

- Versioned REST under `/api/v1`
- Zod validation at the HTTP edge (`validate` middleware)
- Errors: `{ code, message }` via central error middleware
- Auth: JWT access + refresh (`/api/v1/auth/...`)
