# API Documentation

Base URL (local): `http://localhost:5000/api`

All request/response bodies are JSON. Protected routes require:

```
Authorization: Bearer <jwt_token>
```

Errors always take the shape `{ "error": "message" }`.

---

## Auth

### `POST /auth/register`
Rate limited (see `.env` `AUTH_RATE_LIMIT_*`).

**Body**
```json
{ "fullName": "Ara Dev", "email": "ara@example.com", "password": "at-least-8-chars" }
```

**201**
```json
{ "token": "jwt", "user": { "id": 1, "fullName": "Ara Dev", "email": "ara@example.com", "role": "user" } }
```

**409**: email already registered.

### `POST /auth/login`
Rate limited.

**Body** `{ "email": "...", "password": "..." }`
**200**: same shape as register. **401** on bad credentials (no hint which field was wrong).

### `POST /auth/logout`
Requires auth. Records an audit entry; the client should discard its token.

### `GET /auth/me`
Requires auth. Returns the current user's profile.

---

## Projects
All routes require auth. Every query is scoped to `req.user.id`: a user can never see or modify another user's projects.

### `GET /projects`
Query params (all optional):

| Param | Notes |
|---|---|
| `search` | matches project name (substring) |
| `status` | `Not Started` \| `In Progress` \| `Completed` |
| `sortBy` | `name` \| `status` \| `start_date` \| `end_date` \| `created_at` |
| `order` | `asc` \| `desc` |
| `page`, `limit` | pagination, `limit` max 100 |

**200**
```json
{ "data": [ { "id": 1, "name": "...", "status": "In Progress", "...": "..." } ],
  "pagination": { "page": 1, "limit": 10, "total": 3, "totalPages": 1 } }
```

### `GET /projects/:id` → project object, or **404** if not found/not owned.

### `POST /projects`
**Body**
```json
{ "name": "Nexus Mail", "description": "optional", "status": "Not Started", "startDate": "2026-01-01", "endDate": "2026-06-01" }
```
**201** → created project.

### `PUT /projects/:id`: same body shape as create (fields are optional; omitted fields keep their current value). **200** → updated project.

### `DELETE /projects/:id`: **204**. Cascades and deletes the project's tasks.

---

## Tasks
All routes require auth, all scoped through the parent project's ownership.

### `GET /tasks`
Query params: `search`, `status` (`Pending`|`In Progress`|`Completed`), `priority` (`Low`|`Medium`|`High`), `projectId`, `sortBy` (`name`|`priority`|`status`|`due_date`|`created_at`), `order`, `page`, `limit`. Same response shape as projects.

### `GET /tasks/:id` → task object, or **404**.

### `POST /tasks`
**Body**
```json
{ "name": "Set up OAuth", "description": "optional", "priority": "High", "status": "Pending", "dueDate": "2026-10-01", "projectId": 1 }
```
**201** → created task. **404** if `projectId` isn't owned by the caller.

### `PUT /tasks/:id`: same shape as create, but `projectId` is optional and ignored if sent (a task's project can't be changed via this endpoint: validated as a well-formed integer if present, but never used to move the task). **200** → updated task.

### `PATCH /tasks/:id/complete`: shortcut to set status to `Completed`. **200** → updated task.

### `DELETE /tasks/:id`: **204**.

---

## Dashboard

### `GET /dashboard`
Requires auth.

**200**
```json
{
  "totalProjects": 4,
  "projectsInProgress": 2,
  "totalTasks": 17,
  "completedTasks": 9,
  "pendingTasks": 6
}
```

---

## Status codes used

| Code | Meaning |
|---|---|
| 200 / 201 | success |
| 204 | success, no body (delete) |
| 400 | validation error: message names the offending field |
| 401 | missing/invalid/expired token, or bad login credentials |
| 403 | authenticated but not permitted (role check) |
| 404 | resource not found, or not owned by the caller |
| 409 | conflict (duplicate email) |
| 429 | rate limit hit on `/auth/*` |
| 500 | unexpected server error (no internal detail leaked) |
