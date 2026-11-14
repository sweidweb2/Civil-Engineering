# Civil Engineering

Monorepo for a civil-engineering operations platform: **web**, **mobile**, and a shared **backend API**.

## What this project is

A modular monolith that serves multiple client interfaces (admin/distributor on web; project manager/worker/guest on mobile) through one versioned REST API. Business logic, auth, and data access live only in the backend.

## Architecture

```
React Web  ──┐
             ├── REST /api/v1 ──► Express (monolith) ──► PostgreSQL (Supabase) + Prisma
React Native─┘                        │
                                      └── Storage (Cloudflare R2)
```

- **Overall:** modular monolith (not microservices)
- **Backend:** layered (Route → Controller → Service → Repository → Prisma) + DDD modules
- **Clients:** feature-based; talk to the API only — never to the database

Source of truth for locked decisions: `Docs/[1] Main App/[1] Tech Stack.md` (and related docs).

## Branches

| Branch     | Role                          | Env               |
| ---------- | ----------------------------- | ----------------- |
| **`play`** | Daily development — work here | Local `.env`      |
| **`dev`**  | Staging                       | `.env.staging`    |
| **`main`** | Production                    | `.env.production` |

Promote with PRs: **`play` → `dev` → `main`**. CI is the **same** on push/PR to `dev` and `main`. Auto-deploy (staging on `dev`, prod on `main`) comes later.

Details: `Docs/[3] Decisions/[2] Git Branch Strategy.md`

## Applications

| App     | Path            | Role                                       |
| ------- | --------------- | ------------------------------------------ |
| Web     | `civil-web/`    | React + TypeScript (Vite) browser clients  |
| Mobile  | `civil-mobile/` | React Native + TypeScript (Expo)           |
| Backend | `backend/`      | Express + TypeScript API, auth, jobs, data |

## Tech stack

| Area          | Choice                                  |
| ------------- | --------------------------------------- |
| Web           | React + TypeScript + Vite               |
| Mobile        | React Native + TypeScript + Expo        |
| Backend       | Express + TypeScript                    |
| Database      | Supabase Postgres + Prisma              |
| Cache / queue | None (in-process rate limit; sync jobs) |
| Storage       | Cloudflare R2                           |
| API           | REST `/api/v1`                          |
| Auth          | JWT + refresh tokens                    |
| Validation    | Zod                                     |
| Client state  | Zustand                                 |
| Deploy        | TBD (no Docker required locally)        |

## Project structure

```text
Civil-Engineering-v1/
├── civil-web/          # React web app
│   └── src/
│       ├── features/
│       ├── components/
│       ├── theme/
│       ├── hooks/
│       └── services/
├── civil-mobile/       # React Native (Expo)
│   └── src/
│       ├── features/
│       ├── components/
│       ├── navigation/
│       ├── theme/
│       ├── hooks/
│       └── services/
├── backend/            # Express API
│   └── src/
│       ├── modules/    # DDD domains (auth, users, projects, …)
│       ├── middleware/
│       ├── config/
│       ├── database/
│       └── jobs/
├── Docs/               # Numbered docs: Main App, Prompts, Decisions, Database
├── .cursor/rules/      # Cursor / AI project rules
├── .editorconfig
├── .gitignore
└── README.md
```

Optional later: `infrastructure/` only when real deploy/proxy config exists (do not create empty).

## Environment setup

Each app has its own env files (do **not** commit real secrets):

| App     | Files                                             |
| ------- | ------------------------------------------------- |
| Backend | `backend/.env`, `.env.staging`, `.env.production` |
| Web     | `civil-web/.env` (`VITE_*`)                       |
| Mobile  | `civil-mobile/.env` (`EXPO_PUBLIC_*`)             |

1. Copy or edit the local `.env` in each app.
2. Replace placeholders (`CHANGE_ME`, `example.com`, DB passwords).
3. Prefer `.env.example` (when added) as the committed template.

Public client vars only: `VITE_*` (web), `EXPO_PUBLIC_*` (mobile). All secrets stay on the backend / host.

## How to run (local)

Prerequisites: **Node.js** (LTS), **npm**, and a **Supabase Postgres** `DATABASE_URL` for the API. No Docker or Redis required.

### Backend

```bash
cd backend
npm install
# ensure .env has DATABASE_URL (Supabase), JWT secrets
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

## Docker / Redis

Removed. No Dockerfiles, Compose files, or Redis. Local dev is just npm:

```bash
cd backend && npm run dev     # uses backend/.env → DATABASE_URL (Supabase Postgres)
cd civil-web && npm run dev   # uses civil-web/.env → API at localhost:3000
```

Backend tests use embedded-postgres (no Docker). Decisions: `Docs/[3] Decisions/[4] Docker & Infrastructure.md` and `[8] Redis.md` (both superseded).

## Deployment

- **Host / runtime / edge proxy:** TBD (earlier Hostinger VPS + Docker + Nginx plan superseded)
- **Clients:** mobile via store / EAS builds
- **Migrations:** run as an explicit release step (not silently on every API boot unless that pattern is locked later)

## Documentation

| Doc                                          | Purpose                                    |
| -------------------------------------------- | ------------------------------------------ |
| `Docs/[1] Main App/[1] Tech Stack.md`        | Locked technical decisions                 |
| `Docs/[1] Main App/[2] Bedrock Checklist.md` | Foundation checklist                       |
| `Docs/[3] Decisions/`                        | Locked decisions (format/lint, git, CI, …) |
| `Docs/[2] Prompts/`                          | Master AI / agent prompts                  |
| `.cursor/rules/`                             | Always-on and scoped coding rules          |

## Principles (short)

- Understand existing architecture before changing it
- Keep layers thin; never bypass Route → Controller → Service → Repository
- Clients never touch Postgres / Prisma
- Ask before changing architecture or adding libraries
