# Decision — Docker & Infrastructure

**Status:** LOCKED (file layout + principles; exact production topology remains flexible)  
**Date:** 2026-09-20  
**Applies to:** monorepo root, `civil-web/`, `backend/` (not `civil-mobile/` production deploy)  
**Source of truth for stack:** `Docs/[1] Main App/[1] Tech Stack.md`  
**Cursor rule:** `.cursor/rules/docker.mdc`

Repo paths (actual):

| Logical app | Folder          |
| ----------- | --------------- |
| Web         | `civil-web/`    |
| Mobile      | `civil-mobile/` |
| Backend     | `backend/`      |

---

## Decision

### Docker strategy

- Docker is used for **local development** and **production deployment** (Hostinger VPS).
- Each **deployable** application/service that requires a container owns its **Dockerfile**.
- React Native mobile does **not** require a production Dockerfile — distribution is via Google Play / Apple App Store (EAS / store builds).
- Docker Compose orchestrates services at the **monorepo root**.

### Docker files

#### Web (`civil-web/`)

```text
civil-web/
├── Dockerfile
└── .dockerignore
```

Purpose:

- Build the React + Vite application.
- Produce production static assets.
- Run a container that serves those assets (Nginx-based image is fine).
- On the VPS, **edge Nginx** (when added under `infrastructure/nginx/`) remains the sole public entry and may proxy/serve the web build.

#### Backend (`backend/`)

```text
backend/
├── Dockerfile
└── .dockerignore
```

Purpose:

- Build the Express + TypeScript API.
- Run the production backend with runtime dependencies only.
- Stay on the internal Docker network — not exposed publicly except via Nginx.

#### Mobile (`civil-mobile/`)

No production Dockerfile.

```text
civil-mobile/
```

Distributed through:

```text
Android → Google Play
iOS     → Apple App Store
```

Optional later: a **dev-only** Dockerfile is allowed if useful for tooling — never as the VPS production deploy path.

### Docker Compose

Compose files live at the monorepo root:

```text
Civil-Engineering-v1/
├── docker-compose.yml
├── docker-compose.staging.yml
├── docker-compose.production.yml
```

#### `docker-compose.yml`

Local development. **Default: Postgres only.**

Run API + web with npm on the host. Redis is skipped until wired.

#### `docker-compose.staging.yml` / `docker-compose.production.yml`

Deploy-oriented stacks: **Postgres + API + web** (no Redis yet).

- `env_file`: `backend/.env.staging` or `backend/.env.production`
- Compose **overrides** `DATABASE_URL` to use host `postgres` (Docker DNS)
- Local `backend/.env` keeps `127.0.0.1` for `npm run dev`

Related (tests only): `backend/docker-compose.test.yml`.

### Infrastructure folder

An `infrastructure/` directory is **not** mandatory.

Do **not** create it empty. Create it when Nginx or other infra config has a real purpose:

```text
Civil-Engineering-v1/
└── infrastructure/
    ├── nginx/
    └── docker/
```

#### `infrastructure/nginx/` (when needed)

Nginx config (`nginx.conf`, `conf.d/`, …). Responsibility:

```text
Internet
    ↓
Nginx          ← sole public HTTP/HTTPS entry
    ├── Web (static / SPA)
    └── Backend API (/api/v1 → Express)
```

#### `infrastructure/docker/` (when needed)

Only when Docker-specific infra grows beyond root Compose files.

### Initial scaffold (locked layout)

```text
Civil-Engineering-v1/
├── civil-web/
│   ├── Dockerfile
│   └── .dockerignore
│
├── civil-mobile/          # no production Dockerfile
│
├── backend/
│   ├── Dockerfile
│   └── .dockerignore
│
├── docker-compose.yml
├── docker-compose.production.yml
│
├── .gitignore
├── .editorconfig
└── README.md
```

Add `infrastructure/` later when Nginx (or equivalent) config is implemented.

---

## Principles (locked)

- Keep application Dockerfiles with their respective applications.
- Keep Compose orchestration at the monorepo root.
- Do not create a Dockerfile for React Native **production** deployment.
- Do not put application business logic into Docker configuration.
- Do not commit secrets into Dockerfiles or Compose files.
- Use environment variables / host secrets for environment-specific configuration.
- Use `.dockerignore` for each application build context.
- Use multi-stage builds where appropriate.
- Run production containers with only required dependencies.
- Add health checks where appropriate.
- Use persistent volumes for stateful services (PostgreSQL required).
- Keep development and production configuration clearly separated.
- Do not introduce unnecessary containers/services.
- Keep Docker consistent with the **modular monolith** (one API, not microservices).
- Nginx is the sole public entry when deployed; do not publish Postgres, Redis, or Express to the public internet.

---

## Still open (do not silently lock)

- Exact production service topology (which optional services run on the VPS).
- Exact Nginx config / TLS / domain wiring (add with `infrastructure/nginx/`).
- Whether web static is served only by edge Nginx vs a dedicated web image behind it.
- Worker process shape (in-API jobs vs separate worker container).
- Observability / monitoring stack.

---

## Checklist mapping

See `Docs/[1] Main App/[2] Bedrock Checklist.md` §20 and §26.
