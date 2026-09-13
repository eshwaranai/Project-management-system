# Ledger - Project Management System

A full-stack app for managing projects and tasks: create projects, break them into tasks, track progress, and see it all summarized on a dashboard.

**Stack:** React (Vite), Node.js/Express, MySQL, JWT auth

```
pms/
├── backend/     Express API, MySQL schema, tests
├── frontend/    React SPA (Vite)
├── docker-compose.yml
├── API_DOCUMENTATION.md
└── ER_DIAGRAM.md
```

## Features

- Register / login / logout with JWT, bcrypt-hashed passwords
- Full CRUD on projects and tasks, strictly scoped to the logged-in user
- Dashboard: total projects, total tasks, completed, pending, in-progress
- Search projects/tasks by name; filter by status/priority; sort; paginate
- Security: hashed passwords, JWT middleware, input validation, parameterized queries (no raw SQL string building), rate-limited auth endpoints
- Bonus: audit log of every create/update/delete/login, Docker support, CI pipeline, automated tests, basic role field for future RBAC

## Prerequisites

- Node.js 20+
- MySQL 8 (or MariaDB 10.11+)
- npm

## 1. Database setup

```bash
mysql -u root -p < backend/database/schema.sql
# then create an app user and grant it access, e.g.:
mysql -u root -p -e "
  CREATE USER 'pms_user'@'localhost' IDENTIFIED BY 'change_me';
  GRANT ALL PRIVILEGES ON project_management.* TO 'pms_user'@'localhost';
  FLUSH PRIVILEGES;
"
```

## 2. Backend

```bash
cd backend
cp .env.example .env   # fill in DB credentials and a real JWT_SECRET
npm install
npm run dev             # http://localhost:5000
```

Run tests: `npm test` (uses Node's built-in test runner, no DB required).

### Environment variables (`backend/.env`)

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `JWT_SECRET` | signing key, use a long random string in production |
| `JWT_EXPIRES_IN` | token lifetime, e.g. `1d` |
| `AUTH_RATE_LIMIT_WINDOW_MS`, `AUTH_RATE_LIMIT_MAX` | brute-force throttling on `/api/auth/*` |
| `CLIENT_ORIGIN` | allowed CORS origin (the frontend URL) |

## 3. Frontend

```bash
cd frontend
cp .env.example .env   # VITE_API_URL, defaults to http://localhost:5000/api
npm install
npm run dev             # http://localhost:5173
```

Open `https://frontend-red-nine-zsnb4bylqi.vercel.app`, register an account, and go.

## Running everything with Docker

```bash
docker compose up --build
```

This starts MySQL (schema auto-loaded on first boot), the API on `:5000`, and the frontend on `:5173`. Change the default passwords in `docker-compose.yml` before using this anywhere but your own machine.

## CI

`.github/workflows/ci.yml` runs on every push and pull request: installs backend and frontend dependencies, runs the backend test suite, and builds the frontend to catch build-time errors early.

## Deployment

- **Backend**: any Node host works (Render, Railway, Fly.io). Set the env vars above and point `DB_HOST` etc. at a managed MySQL instance (PlanetScale, Railway, RDS).
- **Frontend**: build with `npm run build` and deploy `frontend/dist` as a static site (Vercel, Netlify, or the included nginx Docker image). Set `VITE_API_URL` to the deployed backend's URL at build time.
- Update `CLIENT_ORIGIN` on the backend to the deployed frontend's origin, or CORS will block it.
- Add the live URL here once deployed: `[https://frontend-red-nine-zsnb4bylqi.vercel.app]`

## Notes

Logout is a client-side token discard since JWTs are stateless. The endpoint exists and is audited; a production version would add a token blocklist or short-lived tokens with refresh.

## API & schema docs

- [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md): every endpoint, params, and response shapes
- [`ER_DIAGRAM.md`](ER_DIAGRAM.md): schema, relationships, and design rationale

## Design notes

- **Ownership enforcement**: every project/task query filters by `user_id` (tasks via a join to their parent project) at the SQL level, not just an app-layer check, so there's no path that leaks another user's data.
- **Passwords & tokens**: bcrypt with 12 salt rounds; JWTs are stateless, so logout is a client-side token discard.
- **SQL injection**: all queries use `mysql2` parameterized queries (`?` placeholders), no string concatenation of user input into SQL.
- **Validation**: `express-validator` runs before any controller touches the database, so malformed requests never reach a query.
- **Audit log**: writes are fire-and-forget, a failed audit insert never breaks the user-facing request.

## Session security

Authentication uses expiring JWT sessions. The Docker configuration defaults to a 2-hour token lifetime. The frontend reads the token expiry, logs the user out automatically when the session expires, and also clears the session immediately when the API returns HTTP 401. Change `JWT_EXPIRES_IN` in the backend environment for a different session lifetime.
