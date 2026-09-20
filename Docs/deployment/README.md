# Deployment

**Source of truth**

- [`Docs/[3] Decisions/[4] Docker & Infrastructure.md`](../../Docs/[3]%20Decisions/[4]%20Docker%20%26%20Infrastructure.md)
- [`.cursor/rules/docker.mdc`](../../.cursor/rules/docker.mdc)
- Root compose: `docker-compose.yml`, `docker-compose.staging.yml`, `docker-compose.production.yml`
- App Dockerfiles: `backend/Dockerfile`, `civil-web/Dockerfile`

**Summary**

- Nginx is the sole public entry (when configured)
- Docker + Hostinger VPS target
- Local day-to-day: Postgres via Compose; API/web often run with `npm run dev` on the host
