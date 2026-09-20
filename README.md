# Civil Engineering

Monorepo for a civil-engineering operations platform: **web**, **mobile**, and a shared **backend API**.

## What this project is

A modular monolith that serves multiple client interfaces (admin/distributor on web; project manager/worker/guest on mobile) through one versioned REST API. Business logic, auth, and data access live only in the backend.

## Architecture

```
React Web  ──┐
             ├── REST /api/v1 ──► Express (monolith) ──► PostgreSQL + Prisma
React Native─┘                        │
                                      ├── Redis (cache / queue)
                                      └── Storage (TBD)
```

- **Overall:** modular monolith (not microservices)
- **Backend:** layered (Route → Controller → Service → Repository → Prisma) + DDD modules
- **Clients:** feature-based; talk to the API only — never to the database

Source of truth for locked decisions: `Docs/[1] Main App/[1] Tech Stack.md` (and related docs).

## Applications

| App | Path | Role |
| --- | --- | --- |
| Web | `civil-web/` | React + TypeScript (Vite) browser clients |
| Mobile | `civil-mobile/` | React Native + TypeScript (Expo) |
| Backend | `backend/` | Express + TypeScript API, auth, jobs, data |

## Tech stack

| Area | Choice |
| --- | --- |
| Web | React + TypeScript + Vite |
| Mobile | React Native + TypeScript + Expo |
| Backend | Express + TypeScript |
| Database | PostgreSQL + Prisma |
| Cache / queue | Redis |
| Storage | TBD |
| API | REST `/api/v1` |
| Auth | JWT + refresh tokens |
| Validation | Zod |
| Client state | Zustand |
| Deploy | Docker + Nginx on Hostinger VPS |

## Project structure

```text
Civil-Engineering-v1/
├── civil-web/          # React web app
│   ├── Dockerfile
│   ├── .dockerignore
│   └── src/
│       ├── features/
│       ├── components/
│       ├── theme/
│       ├── hooks/
│       └── services/
├── civil-mobile/       # React Native (Expo) — no production Dockerfile
│   └── src/
│       ├── features/
│       ├── components/
│       ├── navigation/
│       ├── theme/
│       ├── hooks/
│       └── services/
├── backend/            # Express API
│   ├── Dockerfile
│   ├── .dockerignore
│   └── src/
│       ├── modules/    # DDD domains (auth, users, projects, …)
│       ├── middleware/
│       ├── config/
│       ├── database/
│       └── jobs/
├── Docs/               # Architecture, checklists, prompts, decisions
├── .cursor/rules/      # Cursor / AI project rules
├── docker-compose.yml
├── docker-compose.production.yml
├── .editorconfig
├── .gitignore
└── README.md
```

Optional later: `infrastructure/nginx/` and `infrastructure/docker/` when real Nginx / extra Docker config is needed (do not create empty).

## Environment setup

Each app has its own env files (do **not** commit real secrets):

| App | Files |
| --- | --- |
| Backend | `backend/.env`, `.env.staging`, `.env.production` |
| Web | `civil-web/.env` (`VITE_*`) |
| Mobile | `civil-mobile/.env` (`EXPO_PUBLIC_*`) |

1. Copy or edit the local `.env` in each app.
2. Replace placeholders (`CHANGE_ME`, `example.com`, DB passwords).
3. Prefer `.env.example` (when added) as the committed template.

Public client vars only: `VITE_*` (web), `EXPO_PUBLIC_*` (mobile). All secrets stay on the backend / host.

## How to run (local)

Prerequisites: **Node.js** (LTS), **npm**, and locally (or via Docker) **PostgreSQL** + **Redis** for the API.

### Backend

```bash
cd backend
npm install
# ensure .env has DATABASE_URL, REDIS_URL, JWT secrets
npm run dev   # add this script when the app bootstrap exists
```

### Web

```bash
cd civil-web
npm install
npm run dev
```

Vite defaults to [http://localhost:5173](http://localhost:5173). Point `VITE_API_BASE_URL` at the API (e.g. `http://localhost:3000/api/v1`).

### Mobile

```bash
cd civil-mobile
npm install
npm start
```

Then open in Expo Go / simulator. Set `EXPO_PUBLIC_API_BASE_URL` to your machine API URL (use LAN IP for a physical device).

## Docker setup

Decision: `Docs/[3] Decisions/[4] Docker & Infrastructure.md` · rules: `.cursor/rules/docker.mdc`

Target stack on the VPS:

- **Nginx** — sole public entry (TLS + reverse proxy + web static) when `infrastructure/nginx/` is added
- **Web** — `civil-web` image (Vite build)
- **API** — Express container (internal network only in production)
- **PostgreSQL** — named volume
- **Redis** — cache / queue
- **Mobile** — not a Docker service (Play / App Store)

Local (Postgres + Redis + API + web):

```bash
docker compose up -d
```

Production-style override:

```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

Data-only local (run Node apps on the host):

```bash
docker compose up -d postgres redis
```

Do not commit secrets into Compose or Dockerfiles — use host / Hostinger env.
## Deployment

- **Host:** Hostinger VPS
- **Runtime:** Docker
- **Edge:** Nginx (HTTPS, proxy `/api` → API, serve web build)
- **Clients:** web via Nginx; mobile via store / EAS builds (not a Docker service on the VPS)
- **Migrations:** run as an explicit release step (not silently on every API boot unless that pattern is locked later)

## Documentation

| Doc | Purpose |
| --- | --- |
| `Docs/[1] Main App/[1] Tech Stack.md` | Locked technical decisions |
| `Docs/[1] Main App/[2] Bedrock Checklist.md` | Foundation checklist |
| `Docs/[3] Decisions/` | Locked decisions (format/lint, git, CI, Docker, …) |
| `Docs/[2] Prompts/` | Master AI / agent prompts |
| `.cursor/rules/` | Always-on and scoped coding rules |

## Principles (short)

- Understand existing architecture before changing it
- Keep layers thin; never bypass Route → Controller → Service → Repository
- Clients never touch Postgres / Redis / Prisma
- Ask before changing architecture or adding libraries
