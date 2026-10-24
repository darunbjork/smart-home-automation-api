# Hearth Frontend Contract → Backend Changes Required

**Source of truth:** Hearth instructor prompt v2.3 + Day 0 audit (2026-10-15)

## Critical (must be fixed before the listed frontend day)

| Priority | Backend Task              | What the frontend needs                                                                                                                                                                               | Why it blocks                                                                                | Frontend Day   |
| -------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------- |
| P0       | **BE-3 + BE-18**          | Every household/device route must check membership + role **per household**. `PATCH /households/:id` must be owner-only. Global `user.role` must stop being used for auth.                            | Currently any logged-in user can rename any household and list/delete any user.              | Day 17, 22, 26 |
| P0       | **BE-15**                 | `GET /users/profile` must exist **before** `/:id` and return a stable shape: `{ user, households: [{ _id, name, ownerId }] }`                                                                         | Boot sequence after refresh needs the profile. Today the route falls through to `/:id`.      | Day 17         |
| P0       | **BE-1**                  | Refresh must be **`POST /users/refresh`**. Rotation + reuse detection. Tokens stored hashed. Access TTL ≤ 15 min.                                                                                     | State-changing GET is unsafe; current cookie + token behaviour is broken for the auth model. | Day 17         |
| P0       | **BE-2 + BE-16**          | Cookie: `HttpOnly; Secure; SameSite=Lax` (or `None` only if truly cross-site). `CORS_ORIGINS` from env (exact match, credentials: true). `app.set('trust proxy', 1)`. Per-IP + per-route rate limits. | Cross-site cookie fails in Safari; global limiter throttles the whole app behind Render.     | Day 13–17      |
| P1       | **BE-4**                  | When header `X-Client: mobile` → return refresh token in body and accept it on refresh/logout. Web stays cookie-only.                                                                                 | Mobile cannot reliably keep cookies across cold starts.                                      | Day 72         |
| P1       | **BE-5**                  | Emit `device:new`, `device:update`, `device:deleted`. Join only rooms the user belongs to; kick on membership change.                                                                                 | Frontend real-time + delete UX depends on these events.                                      | Day 36         |
| P1       | **BE-6**                  | `PATCH /devices/:id` must **merge** `data` keys, validate per type, accept `expectedUpdatedAt` → respond **409** on stale.                                                                            | Optimistic updates + dial + brightness + lock all need this.                                 | Day 41–43      |
| P1       | **BE-17**                 | Command lifecycle: only set `pending` if an ack channel exists; timeout → `unknown`; simulated devices stay `online`.                                                                                 | Controls stay disabled forever on simulated devices today.                                   | Day 36         |
| P2       | **BE-9**                  | Cursor pagination on device list (`limit` ≤ 100, `cursor`).                                                                                                                                           | Device grid will request pages.                                                              | Day 33         |
| P2       | **BE-8**                  | `/ai/process` must implement the full AI Agent Safety Contract (minimal context, Zod output, allowlists, no auto-unlock, rate limit, audit).                                                          | HomeBot commands.                                                                            | Day 49         |
| P2       | **BE-12**                 | `DELETE /users/me` + data export.                                                                                                                                                                     | Settings page.                                                                               | Day 62.b       |
| P3       | **BE-10 / BE-11 / BE-19** | Sustained-offline webhook (HMAC), agent proposals surface, push tokens.                                                                                                                               | Phase 9 Sentinel.                                                                            | Day 90+        |

## Auth model the frontend is built on (do not change)

1. Access token = **memory only** (never localStorage).
2. Refresh token = **HttpOnly cookie** on web; body + SecureStore on mobile (`X-Client: mobile`).
3. Boot sequence = `POST /users/refresh` → `GET /users/profile`.
4. Single-flight refresh on 401.
5. After every silent refresh the Socket.IO client disconnects and reconnects with the new token.

## Response shape the frontend expects

- All error responses: `{ error: { code?: string, message: string } }` (no stack in production).
- Profile: must include `households: [{ _id, name, ownerId }]` so the client can derive per-household role.
- Device `PATCH` with `expectedUpdatedAt` that does not match → **409**.

## Temporary domains (Day 0 decision — 0.4 locked 2026-10-15)

- **No custom domains** for backend or frontend, for now.
- API: `https://smart-home-api-c9r8.onrender.com` (default Render URL).
- Web: default Cloudflare Pages URL (to be added once deployed).
- **ADR 8 deferred.** Accepted residual risk: with different origins, Safari/ITP may break the refresh cookie (`SameSite` cross-site behaviour). Revisit before v1.0.0.
- Action item: set `FRONTEND_URL` / `CORS_ORIGINS` env var on Render once the Pages URL exists, otherwise CORS (`src/app.ts:26`) will block the frontend.

## Day 0 audit evidence (2026-10-15)

All five critical findings confirmed still broken in `main`:

- **C1** — `src/routes/household.routes.ts:384` `PATCH /households/:id` has no ownership check (`src/controllers/household.controller.ts:213` does a bare `findByIdAndUpdate`).
- **C2** — `src/services/user.service.ts:31` registers every user as `role: "owner"`, so `authorize(["owner"])` on `GET /users` and `DELETE /users/:id` is open to any authenticated user.
- **C3** — refresh cookie `sameSite: "strict"` at `src/controllers/user.controller.ts:64,198`.
- **C4** — no `trust proxy` in `src/`; global `apiLimiter` at `src/app.ts:41-43` (live `ratelimit-*` headers present on `/health`).
- **C5** — no `GET /users/profile`; request falls through to `/users/:id` (`src/routes/user.routes.ts:85`) and returns `401 No access token provided or malformed.`

Live health check: `GET /health` → `{"status":"UP","timestamp":"2026-10-15T17:09:24.921Z","message":"Smart Home Automation API is healthy"}`
