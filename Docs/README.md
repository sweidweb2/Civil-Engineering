# Documentation map

Canonical project docs live under **`Docs/`** (capital D) and **`.cursor/rules/`**.  
This `docs/` tree is the **index** — short entry points that point at those sources so the Bedrock checklist paths stay stable.

| Folder                           | Purpose                       | Source of truth                                                         |
| -------------------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| [architecture/](./architecture/) | System shape, layers, clients | `Docs/[1] Main App/[1] Tech Stack.md`, `.cursor/rules/project-core.mdc` |
| [api/](./api/)                   | REST `/api/v1` conventions    | Tech Stack + `project-core` API sections + backend modules              |
| [database/](./database/)         | PostgreSQL + Prisma           | Tech Stack, Prisma schema, `Docs/[4] Database/`, `backend.mdc`          |
| [deployment/](./deployment/)     | Docker, Nginx, VPS            | `Docs/[3] Decisions/[4] Docker & Infrastructure.md`, `docker.mdc`       |
| [development/](./development/)   | Local setup, contributing     | Root `README.md`, `Docs/[1] Main App/[3] Contributing.md`               |
| [decisions/](./decisions/)       | ADRs / locked choices         | `Docs/[3] Decisions/`                                                   |

## Keeping docs in sync with code

When you change something that affects contracts or architecture:

1. Update the **source of truth** first (`Docs/…` or `.cursor/rules/…`).
2. Update this index only if a path or summary drifts.
3. Tick / untick items in `Docs/[1] Main App/[2] Bedrock Checklist.md` when bedrock status changes.
4. Do **not** duplicate long prose here — link instead.

Last reviewed: 2026-09-20.
