# Project Technical Decisions — LOCKED

## 1. Technology Stack

| Area              | Decision                                                                   |
| ----------------- | -------------------------------------------------------------------------- |
| **Web**           | React + TypeScript                                                         |
| **Mobile**        | React Native + TypeScript                                                  |
| **Backend**       | Express + TypeScript                                                       |
| **Database**      | Supabase Postgres + Prisma                                                 |
| **Cache / Queue** | None (no Redis; jobs sync; rate limit in-process via `express-rate-limit`) |
| **Storage**       | Cloudflare R2 (S3 API)                                                     |
| **Local run**     | `npm` in `backend/` + `civil-web/` (no Docker required)                    |
| **Deployment**    | TBD (Docker/Hostinger/Nginx plan superseded)                               |

---

## 2. System Architecture

| Area                         | Decision                   |
| ---------------------------- | -------------------------- |
| **Overall Architecture**     | Monolith                   |
| **Backend Architecture**     | Layered Architecture       |
| **Backend Folder Structure** | DDD (Domain-Driven Design) |
| **API Style**                | REST                       |
| **API Versioning**           | Versioned API              |
| **Authentication**           | JWT + Refresh Token        |
| **Frontend Architecture**    | Feature-Based              |
| **State Management**         | Zustand                    |
| **Validation**               | Zod                        |

---

## 3. High-Level System

```
                    ┌─────────────────────┐
                    │      React Web      │
                    │    + TypeScript     │
                    └──────────┬──────────┘
                               │
                               │ REST API
                               │
                    ┌──────────▼──────────┐
                    │                     │
                    │ Express + TypeScript│
                    │      Backend        │
                    │      Monolith       │
                    │                     │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
         PostgreSQL          Storage
       (Supabase) + Prisma     (R2)

                    ▲
                    │ REST API
                    │
          ┌─────────┴─────────┐
          │                   │
          │   React Native    │
          │   + TypeScript    │
          │                   │
          └───────────────────┘
```

---

## 4. Backend Architecture

The backend flow:

```
Request
   ↓
Route
   ↓
Controller
   ↓
Service
   ↓
Repository
   ↓
Prisma
   ↓
PostgreSQL
```

#### Responsibilities

**Controller**

- Handles HTTP requests/responses
- Receives input
- Calls the appropriate service
- Returns the API response

**Service**

- Contains business logic
- Applies application rules
- Coordinates operations

**Repository**

- Handles data access
- Communicates with Prisma/database

**Prisma**

- ORM / database access layer

---

## 5. Backend Organization

The backend implements a **DDD-oriented structure**, organizing code around business domains/modules.

Example:

```
backend/
└── src/
    ├── modules/
    │   ├── auth/
    │   ├── users/
    │   ├── projects/
    │   ├── expenses/
    │   ├── workers/
    │   ├── materials/
    │   └── ...
    │
    ├── middleware/
    ├── config/
    ├── database/
    ├── jobs/
    └── app.ts
```

Each module contains its own layers:

```
projects/
├── project.routes.ts
├── project.controller.ts
├── project.service.ts
├── project.repository.ts
├── project.schema.ts
└── project.types.ts
```

---

## 6. Frontend Architecture

The web and mobile codebases are **separate frontend clients** that both consume the same backend API.

### Web

```
web/
└── src/
    ├── features/
    │   ├── auth/
    │   ├── projects/
    │   ├── expenses/
    │   └── workers/
    │
    ├── components/
    ├── hooks/
    ├── services/
    └── ...
```

### Mobile

```
mobile/
└── src/
    ├── features/
    │   ├── auth/
    │   ├── projects/
    │   ├── expenses/
    │   └── workers/
    │
    ├── components/
    ├── navigation/
    ├── services/
    └── ...
```

---

## 7. API

The backend provides a **REST API**.

Example endpoints:

```
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
PUT    /api/v1/projects/:id
DELETE /api/v1/projects/:id
```

API versioning follows the pattern: `/api/v1`

---

## 8. Authentication

Authentication flow:

```
Login
  ↓
Access Token
  +
Refresh Token
  ↓
API Requests
```

Authorization uses **role gates + resource ownership** (not a permission-matrix RBAC). See `Docs/[3] Decisions/[6] Security Foundation.md`.

---

## 9. State Management

The client-side application state is managed using **Zustand**.

```
Zustand
    ↓
Client/UI state
```

Keep API/server data separate from client state—don't put every response in Zustand by default.

---

## 10. Validation

Validation uses **Zod**.

Perform validation on the frontend (user experience) and backend (security/correctness):

```
Frontend
   ↓
Zod validation

Backend
   ↓
Zod validation
   ↓
Business logic
```

> Frontend validation is not a security boundary.

---

## 11. Infrastructure

**Database:** Supabase Postgres (accessed only by the Express API via Prisma).

**Local development:** run `npm` in `backend/` and `civil-web/`. **No Docker required.** Tests use `embedded-postgres`.

**Rate limiting:** in-process memory (`express-rate-limit`), per API instance.

**Removed (superseded):** Redis, BullMQ, Dockerfiles, Docker Compose, `.dockerignore`, `/api/v1/health/redis`. Jobs stay synchronous. See `Docs/[3] Decisions/[8] Redis.md` and `Docs/[3] Decisions/[4] Docker & Infrastructure.md`.

**Production deploy:** TBD. The earlier Hostinger VPS + Docker + Nginx plan is not the current baseline; record a new decision before locking a host or proxy.

---

## 12. Important Architectural Rule

Frontend applications **never access the database directly**.

```
React ────────┐
              ├──→ REST API → Express → Database
React Native ─┘
```

**Not allowed:**

```
React ─────────→ PostgreSQL

React Native ──→ PostgreSQL
```

The backend is the single entry point for business logic, authorization, and database access.

---

## 13. Current Decisions Still Open

The following points are **not yet locked**:

- Detailed DDD domain boundaries
- Production hosting / deploy topology (Docker plan superseded)
- Reverse proxy / TLS / domain wiring (if/when needed)
- Some infrastructure/security / monitoring choices (to be decided during implementation)

All other listed items above are the **locked technical baseline** for the project.
