# Decision: Mobile client parked

**Status:** Accepted  
**Date:** 2026-11-14  
**Applies to:** monorepo layout, Tech Stack, Bedrock, README, project-core rules

## Context

`civil-mobile/` was removed from the active tree while locked docs still described a three-app monorepo (web + mobile + backend). That left dual truth for agents and contributors.

## Decision

- **Park** the React Native / Expo client. It is **not** part of the active delivery surface.
- Active clients: **`civil-web/`** + **`backend/`** only.
- The shared REST API (`/api/v1`) remains the contract a future mobile app would consume.
- Do **not** restore or scaffold `civil-mobile/` until a new decision unparks it.

## Consequences

- Local run / CI focus on `backend/` and `civil-web/`.
- Docs and Cursor rules mark mobile as parked (deferred), not as a required folder.
- Unparking later requires restoring the app tree and updating Tech Stack / Bedrock / README / project-core together.
