# Decision: Mobile client unparked

**Status:** Accepted  
**Date:** 2026-11-14  
**Applies to:** monorepo layout, Tech Stack, Bedrock, README, project-core rules, CI  
**Supersedes:** [Mobile Client Parked](./[11]%20Mobile%20Client%20Parked.md)

## Context

`civil-mobile/` was parked and removed from the active tree. Delivery is ready to restore the Expo React Native client alongside web and backend.

## Decision

- **Unpark** the React Native / Expo client. Restore `civil-mobile/` to the active monorepo.
- Active clients: **`civil-web/`** + **`civil-mobile/`** + **`backend/`**.
- Mobile consumes the same versioned REST API (`/api/v1`) only — never PostgreSQL or Prisma.
- PR quality gates for mobile stay in `.github/workflows/ci.yml` (lint/unit when scripts exist).
- Store / native release (EAS, TestFlight, Play) remains a **separate** later workflow — not part of every-PR CI. See [CI Today & Mobile Release Split](./[12]%20CI%20Today%20%26%20Mobile%20Release%20Split.md).

## Consequences

- Restore `civil-mobile/` from git history (do not invent a parallel greenfield layout).
- Update Tech Stack, Bedrock, README, Libraries, and project-core together with this decision.
- Re-enable the `mobile` job and path-filter wiring in `ci.yml`.
- Local run: `cd civil-mobile && npm ci` + `.env` from `.env.example` + `npx expo start`.
- UI languages / RTL: see [Mobile i18n & RTL](./[16]%20Mobile%20i18n%20%26%20RTL.md).
