# Architecture

**Source of truth**

- [`Docs/[1] Main App/[1] Tech Stack.md`](../../Docs/[1]%20Main%20App/[1]%20Tech%20Stack.md) — locked stack, monorepo, API shape
- [`.cursor/rules/project-core.mdc`](../../.cursor/rules/project-core.mdc) — layers, DDD modules, client/backend split
- [`.cursor/rules/backend.mdc`](../../.cursor/rules/backend.mdc) · [`web.mdc`](../../.cursor/rules/web.mdc) · [`mobile.mdc`](../../.cursor/rules/mobile.mdc)

**Summary**

- Modular monolith Express API + React web + React Native mobile
- Flow: Route → Controller → Service → Repository → Prisma
- Clients call REST `/api/v1` only — never Postgres / Redis / Prisma
