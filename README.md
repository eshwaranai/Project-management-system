# Ledger - Project Management System

A full-stack web application for managing projects and tasks: create projects, break them into tasks, track progress, and see everything summarized on a dashboard. Built as a complete assessment submission covering authentication, authorization, CRUD, search/filtering, and production security practices.

**🔗 Live Demo:** https://frontend-red-nine-zsnb4bylqi.vercel.app
**🔗 Live API:** https://backend-8f3im5oud-eshwaranais-projects.vercel.app/api/health
**📦 Repository:** (this repo)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started (Local Setup)](#getting-started-local-setup)
- [Environment Variables](#environment-variables)
- [Running with Docker](#running-with-docker)
- [Deployment](#deployment-how-this-project-is-actually-hosted)
- [Testing & CI](#testing--ci)
- [Security](#security)
- [API & Database Documentation](#api--database-documentation)
- [Design Decisions](#design-decisions)
- [Known Limitations & Future Work](#known-limitations--future-work)

---

## Overview

Ledger lets a user register, log in, and manage their own projects and the tasks inside them. Every piece of data is scoped strictly to the logged-in user — there is no way for one account to view or modify another account's projects or tasks, enforced at the database query level, not just in the UI.

## Features

**Authentication**
- Register, login, logout with JWT-based sessions
- Passwords hashed with bcrypt (12 salt rounds), never stored or returned in plain text
- Sessions auto-expire and the frontend logs the user out automatically on expiry or a 401 response

**Projects**
- Create, view, edit, delete projects
- Fields: name, description, status (`Not Started` / `In Progress` / `Completed`), start date, end date, created date
- List view with search by name, filter by status, sort, and pagination

**Tasks**
- Create, view, edit, delete tasks under a project
- One-click "mark complete" shortcut
- Fields: name, description, priority (`Low` / `Medium` / `High`), status (`Pending` / `In Progress` / `Completed`), due date, created date
- Search by name, filter by status/priority, sort, pagination

**Dashboard**
- Total projects, total tasks, completed tasks, pending tasks, projects in progress — all scoped to the authenticated user

**Bonus features implemented**
- Audit log recording every create/update/delete/login event
- Docker support (`docker-compose.yml`) for one-command local setup
- CI pipeline (GitHub Actions) running backend tests and a frontend build on every push
- Automated backend test suite
- A `role` column on users, laying the groundwork for role-based access control
- UI polish: loading skeletons, staggered list animations, inline form validation, error banners

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite | Fast dev server, small production bundle, no framework lock-in for a project this size |
| Backend | Node.js + Express | Minimal, explicit routing/middleware, easy to reason about for a REST API |
| Database | MySQL | Relational data (users → projects → tasks) with real foreign-key constraints |
| Auth | JWT + bcrypt | Stateless sessions, industry-standard password hashing |
| Validation | express-validator | Declarative, runs before any controller touches the database |

## Architecture

```
pms/
├── backend/
│   ├── src/
│   │   ├── controllers/     Route handlers (auth, projects, tasks, dashboard)
│   │   ├── middleware/      auth, rate limiting, error handling, audit logging
│   │   ├── routes/          Express routers
│   │   ├── utils/           validators, logger
│   │   ├── config/db.js     MySQL connection pool
│   │   └── app.js           Express app (exported, no .listen() — serverless-compatible)
│   ├── api/index.js         Vercel serverless entry point
│   ├── database/schema.sql  Full DDL
│   └── tests/                Backend test suite
├── frontend/
│   └── src/
│       ├── pages/           Dashboard, Login, Register, Projects, ProjectDetail
│       ├── components/      Forms, modals, badges, protected routes
│       ├── context/         AuthContext (token, user, session expiry)
│       └── api/client.js    Axios instance with auth header + 401 handling
├── .github/workflows/ci.yml
├── docker-compose.yml
├── API_DOCUMENTATION.md
└── ER_DIAGRAM.md
```

## Getting Started (Local Setup)

### Prerequisites
- Node.js 20+
- MySQL 8 (or MariaDB 10.11+), or use Docker (see below) to skip installing MySQL locally
- npm

### 1. Database

```bash
mysql -u root -p < backend/database/schema.sql
mysql -u root -p -e "
  CREATE USER 'pms_user'@'localhost' IDENTIFIED BY 'change_me';
  GRANT ALL PRIVILEGES ON project_management.* TO 'pms_user'@'localhost';
  FLUSH PRIVILEGES;
"
```

### 2. Backend

```bash
cd backend
cp .env.example .env    # fill in DB credentials and a real JWT_SECRET
npm install
npm run dev              # http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env    # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev              # http://localhost:5173
```

Open `http://localhost:5173`, register an account, and go.

## Environment Variables

**Backend (`backend/.env`)**

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000, unused on Vercel) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `DB_SSL` | set `true` for managed MySQL that requires SSL (e.g. Aiven); unset for local MySQL |
| `JWT_SECRET` | signing key — use a long random string in production |
| `JWT_EXPIRES_IN` | token lifetime, e.g. `1d` |
| `AUTH_RATE_LIMIT_WINDOW_MS`, `AUTH_RATE_LIMIT_MAX` | brute-force throttling on `/api/auth/*` |
| `CLIENT_ORIGIN` | allowed CORS origin — the deployed frontend's exact URL |

**Frontend (`frontend/.env`)**

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | base URL of the API, e.g. `http://localhost:5000/api` locally or the deployed backend's `/api` path in production |

## Running with Docker

```bash
docker compose up --build
```

Starts MySQL (schema auto-loaded), the API on `:5000`, and the frontend on `:5173` in one command. Change the default passwords in `docker-compose.yml` before running this anywhere but your own machine.

## Deployment (how this project is actually hosted)

| Piece | Platform | Notes |
|---|---|---|
| Database | [Aiven](https://aiven.io) (free tier, MySQL) | Requires SSL — `DB_SSL=true` |
| Backend | Vercel (serverless functions) | Express app is exported (not `.listen()`-based) from `backend/api/index.js`; `backend/vercel.json` rewrites `/api/*` to that function |
| Frontend | Vercel (static build) | Vite build, `VITE_API_URL` set at build time to the backend's `/api` path |

**Steps to reproduce this deployment:**

1. **Database** — create a free MySQL service on Aiven, copy Host/Port/User/Password from its Overview page, and run `backend/database/schema.sql` against it (via DBeaver, MySQL Workbench, or phpMyAdmin). If `CREATE DATABASE project_management` fails on the free tier's permissions, drop that line and the following `USE project_management;` line, and run the rest directly against the default `defaultdb` database.
2. **Backend** — import the repo into Vercel, set the project root to `backend`, and add the environment variables listed above (pointed at the Aiven database, with `DB_SSL=true`). Vercel automatically picks up `backend/api/index.js` as the serverless function via `backend/vercel.json`.
3. **Frontend** — import the repo into Vercel as a second project, set the root to `frontend`, framework preset Vite, and set `VITE_API_URL` to `<backend-url>/api`.
4. **Connect the two** — set `CLIENT_ORIGIN` on the backend project to the frontend's exact Vercel URL, or the browser will block requests with a CORS error.
5. **Deployment Protection** — make sure "Vercel Authentication" (Require Log In) is turned **off** in the backend project's Settings → Deployment Protection. If left on, every request — including from the frontend — gets redirected to a Vercel login page instead of reaching the API.

## Testing & CI

- `cd backend && npm test` runs the backend test suite (Node's built-in test runner, no live database required).
- `.github/workflows/ci.yml` runs on every push and pull request to `main`: installs backend and frontend dependencies, runs backend tests, and builds the frontend to catch build-time errors before merge.

## Security

- **Password storage**: bcrypt, 12 salt rounds, never returned in any API response.
- **Authentication**: JWT bearer tokens; protected routes verified via middleware before reaching any controller.
- **Authorization**: every project/task query is filtered by the authenticated user's ID at the SQL level (tasks via a join to their owning project) — not just an application-layer check, so there's no endpoint that can leak another user's data even if the ID is guessed.
- **Input validation**: `express-validator` runs before any controller touches the database — required fields, email format, ISO date validity, enum values, string length limits.
- **SQL injection**: all queries use `mysql2` parameterized placeholders (`?`); no string concatenation of user input into SQL anywhere in the codebase.
- **Rate limiting**: `/api/auth/*` is throttled per IP to slow brute-force login/registration attempts.
- **Error handling**: a central error handler ensures stack traces and raw database errors never reach the client — only a clean `{ "error": "message" }`.
- **Audit log**: every create/update/delete/login is recorded with actor, action, and entity, without ever blocking or failing the user-facing request if the audit write itself fails.

## API & Database Documentation

- [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md) — every endpoint, request/response shapes, field-level validation rules, and status codes
- [`ER_DIAGRAM.md`](ER_DIAGRAM.md) — schema, relationships (with a Mermaid ER diagram), normalization and indexing rationale

## Design Decisions

- **Ownership as a query-level guarantee**: authorization isn't a separate check bolted on after the fact — every read/write query itself is scoped to the requesting user, so there's structurally no path to another user's data.
- **Stateless JWT logout**: since JWTs can't be revoked server-side without a blocklist, `POST /api/auth/logout` is audited server-side but the actual sign-out is the client discarding its token. A production version would add short-lived access tokens with refresh tokens, or a token blocklist.
- **Serverless-compatible backend**: `app.js` exports the Express app without calling `.listen()`, so the exact same code runs locally via `src/server.js` (which does call `.listen()`) and on Vercel via `api/index.js` (which doesn't need to) — one codebase, two entry points.

## Known Limitations & Future Work

- No refresh-token rotation — sessions are single long-lived JWTs.
- No pagination cursor for very large datasets (offset-based pagination is used, fine at this scale).
- RBAC is scaffolded (`role` column, `requireRole` middleware) but no admin-only routes currently use it.
- Rate limiting is in-memory per server instance — a distributed deployment would need a shared store (e.g. Redis) for it to be effective across multiple instances.
