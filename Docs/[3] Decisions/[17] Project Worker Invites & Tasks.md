# Decision: Project worker invites & tasks

**Status:** Accepted  
**Date:** 2026-11-27  
**Applies to:** projects, workers portal, civil-mobile PM/Worker  
**Supersedes (feature-scoped):** “assignment is reference-only / workers have no project access” in [Project Management](../%5B1%5D%20Main%20App/%5B6%5D%20Business/%5B3%5D%20Project%20Management.md) and [Features by Role](../%5B1%5D%20Main%20App/%5B6%5D%20Business/%5B9%5D%20Features%20by%20Role.md) for **platform worker invites** only.

## Context

PMs need to invite directory workers onto a project, workers need to accept/reject, and both sides need a simple task list. Older business text treated assignment as an internal PM record with no worker notification or access.

## Decision

- Platform **WORKER** users only (verified + public directory). No virtual/off-platform workers in v1.
- `ProjectWorker` with `PENDING | ACCEPTED | REJECTED`. Cancel/remove **deletes** the row (no `REMOVED`).
- Unique `(projectId, workerUserId)`. Re-invite after reject resets the same row to `PENDING`.
- Rejected rows stay in DB but are **hidden** from worker lists.
- Owner-only mutations; admin **read** only.
- Accept grants a **limited** worker surface: project header + own tasks. Not full PM project data.
- Flat `ProjectTask` (`TODO | IN_PROGRESS | DONE`); unassigned allowed; assign only to ACCEPTED; worker may patch status on own tasks only.
- In-app notifications on invite / accept / reject (internal gateway; HTTP create stays Super-only).
- Mobile + `/api/v1` first; web later. Language: **invite**, not hire. No rates on assignment v1.

## Consequences

- Prisma models `ProjectWorker` / `ProjectTask` and modules under projects + `workers/me/projects`.
- civil-mobile: PM project → My workers (Workers | Tasks); Worker tab **Projects**.
- Update business docs with a pointer to this decision where assignment text would otherwise conflict.
