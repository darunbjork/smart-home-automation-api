# Frontend ↔ Backend Sync — complete contract

**Date:** 2026-10-16 · **Status:** batches T0–T6 shipped (`format:check` · `lint` · `typecheck` · `build` · `test` all green — 8 suites / 58 tests).
**This file is the single source of truth for everything the frontend must know about the backend.** Anything marked ⚠️ _pending_ is contract-locked but not implemented yet — do not build against it.

**API base (production):** `https://smart-home-api-c9r8.onrender.com` · **API docs:** `GET /api-docs` (Swagger UI, non-production only)

---

## 0. Quick start (the five things you must get right)

1. **Access token lives in memory only** (never localStorage/AsyncStorage). Keep-alive via refresh.
2. **Refresh transport is exclusive:** web = HttpOnly cookie `hearth_rt` (just send credentials); mobile = send `X-Client: mobile` on auth calls and store the returned `refreshToken` in SecureStore. Never both.
3. **Boot sequence:** `POST /users/refresh` → `GET /users/profile` → connect Socket.IO with `{ auth: { token } }`.
4. **Single-flight refresh on 401** (except code `REFRESH_INVALID`, which is a hard logout).
5. **Errors are always** `{ error: { code: string, message: string } }` — branch on `code`, display `message`. No stack traces, ever.

---

## 1. Migration checklist — what changed and what you must do

| #   | Change                                                                                                                                                                                                          | Your action                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | Every error body is `{ error: { code, message } }` (incl. 400 malformed JSON, 413 too-large, 404 unknown route, 429 rate limit).                                                                                | Parse `error.code`/`error.message`. No `msg`/`errors[]` arrays anywhere.                                                  |
| 2   | `GET /users` and `DELETE /users/:id` are **removed**. `GET/PATCH /users/:id` are **self-only** (other ids → 404).                                                                                               | Use `GET /users/profile`. `DELETE /users/me` arrives in T11.                                                              |
| 3   | `GET /users/refresh` is **gone** (404).                                                                                                                                                                         | Refresh only via `POST`.                                                                                                  |
| 4   | Refresh tokens **rotate on every use** (opaque, single-use, stored hashed).                                                                                                                                     | Replace stored token (mobile) / rely on `Set-Cookie` (web) after each refresh.                                            |
| 5   | **Reuse detection:** replaying a refresh token >10 s after use revokes the whole session family → subsequent refreshes return `401 REFRESH_INVALID`. (≤10 s is a grace window for near-simultaneous refreshes.) | `401 REFRESH_INVALID` ⇒ clear everything → login screen. Implement single-flight refresh.                                 |
| 6   | Web and mobile transports are mutually exclusive (see §0).                                                                                                                                                      | Web: `credentials: "include"`. Mobile: `X-Client: mobile` header (value exactly `mobile`) + body/header token.            |
| 7   | Cookie `hearth_rt`: `HttpOnly`, `Secure` (prod), `SameSite` (env, default `lax`), **`Path=/users`**, 30 d.                                                                                                      | JS can never read it; browser only sends it to `/users/refresh` and `/users/logout`.                                      |
| 8   | `POST /users/refresh` and `POST /users/logout` **reject browser requests whose `Origin` is not allowlisted** → `403 CORS_FORBIDDEN`. No `Origin` header (mobile/curl) is fine.                                  | Automatic from a properly configured browser client; if your dev origin isn't in `CORS_ORIGINS` you'll get 403 — see §11. |
| 9   | CORS is allowlist-only for HTTP **and** Socket.IO. Disallowed origin → `403 CORS_FORBIDDEN`.                                                                                                                    | Backend env must list your Pages/localhost origin (§11).                                                                  |
| 10  | Authorization is **per household**. `PATCH/DELETE /households/:id` are owner-only; members get `403`, outsiders get `404`. The JWT has **no role claim** and `user.role` is deprecated.                         | Derive role: `household.ownerId === user._id` ⇒ owner, else member.                                                       |
| 11  | `PATCH /households/:id` returns `{ household }`; `POST /households` still returns the **bare** household object.                                                                                                | Handle both shapes (§6).                                                                                                  |
| 12  | `POST /households/:id/invite` **never reveals whether the email exists**: always `200` + the same message, no payload. Invitee pulls the invite from `GET /households/invitations`.                             | Show the server message verbatim; don't claim "invitation sent".                                                          |
| 13  | Profile returns `households: [{ _id, name, ownerId }]`.                                                                                                                                                         | This drives the household switcher + role logic.                                                                          |
| 14  | Rate limits with draft-7 headers (`RateLimit`, `RateLimit-Policy`, `Retry-After`). 429 → `RATE_LIMITED`.                                                                                                        | Back off using `Retry-After` (§9).                                                                                        |
| 15  | Socket.IO handshake: `io(url, { auth: { token: accessToken } })`; no cookie auth; server force-disconnects at access-token expiry.                                                                              | After every silent refresh: `socket.disconnect()` then reconnect with the new token.                                      |
| 16  | Credentials never appear in server logs (redacted; tokens never logged).                                                                                                                                        | Don't rely on server logs for token debugging.                                                                            |
| 17  | Body limit **100 kb** → `413 PAYLOAD_TOO_LARGE`. `X-Powered-By` removed. Trust proxy on (correct client IPs).                                                                                                   | Keep payloads small.                                                                                                      |
| 18  | Passwords must be **≥12 chars** on register. Login failures are always `401` `"Invalid email or password."`                                                                                                     | Update signup copy; never distinguish "unknown email" vs "wrong password".                                                |
| 19  | **Gotcha:** `user.role` is always `"member"` — even for the person who created the household.                                                                                                                   | Never use `user.role` for admin UI; always `ownerId` comparison.                                                          |

---

## 2. Auth & sessions (complete mechanics)

**Access token:** JWT HS256, payload `{ userId, iat, exp }` — **no role, no email**. TTL **15 min** (`ACCESS_TOKEN_EXPIRES_IN`). Send as `Authorization: Bearer <token>` on every authenticated request. Missing/malformed header → `401` `"No access token provided or malformed."`; bad/expired signature → `401` `UNAUTHORIZED`.

**Refresh token:** opaque random string (not a JWT). Server stores only its SHA-256, plus `familyId` and `usedAt`. TTL **30 days**. Rotated on every successful refresh; the old one is dead afterwards (10 s grace window for races).

**Transports:**

|                                         | Web                                                | Mobile                                                  |
| --------------------------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| Client detection                        | default                                            | request header `X-Client: mobile`                       |
| Where refresh token is delivered        | `Set-Cookie: hearth_rt=…`                          | JSON body field `refreshToken` (login/register/refresh) |
| Where it is presented on refresh/logout | cookie (automatic)                                 | `Authorization: Refresh <token>`                        |
| Response of refresh                     | `{ message, accessToken }` + new cookie            | `{ message, accessToken, refreshToken }`, no cookie     |
| Where to store                          | browser cookie jar (HttpOnly — you cannot read it) | SecureStore / Keychain                                  |

Web and mobile responses never mix: a web client never receives `refreshToken` in the body; a mobile request never sets a cookie.

**Flows:**

```
Register (201):  creates user + a household (you are its owner), returns session immediately.
Boot:            POST /users/refresh  →  200 { accessToken } (+ cookie)
                 GET  /users/profile  →  200 { user }   (Authorization: Bearer)
                 io(API, { auth: { token: accessToken } })
Any 401:         single-flight POST /users/refresh → retry original request once.
                 If refresh returns 401 REFRESH_INVALID → hard logout (clear state, login screen).
Logout:          POST /users/logout → 204, cookie cleared, whole session family revoked.
                 Idempotent; safe to call even if refresh token is already dead.
```

**Failure semantics:**

- No refresh token presented → `401` `REFRESH_INVALID` `"No refresh token provided."`
- Token expired/unknown/tampered/stolen (replayed after grace) → `401` `REFRESH_INVALID` `"Invalid or expired refresh token."` + cookie cleared. Family (current + all successor tokens) is revoked.
- Untrusted browser `Origin` on refresh/logout → `403` `CORS_FORBIDDEN`.

---

## 3. Shared conventions

- **Every response echoes `X-Request-Id`** (uses your `X-Request-Id` header if ≤64 chars, else a generated UUID). Include it in bug reports.
- **CORS-exposed response headers:** `X-Request-Id`, `RateLimit`, `RateLimit-Policy`, `Retry-After`.
- **Allowed request headers:** `Content-Type`, `Authorization`, `X-Client`, `X-Requested-With`, `X-Request-Id`.
- **CORS methods:** `GET, POST, PATCH, DELETE, OPTIONS`.
- **Content type:** `application/json` (body limit 100 kb; `express.urlencoded` also enabled).
- **Status codes:** `400` validation/JSON, `401` auth, `403` role/CORS, `404` not found (incl. outsiders — never leak existence), `409` conflict, `413` too large, `422` strict-schema validation, `429` rate limited, `500` bug.
- **`user.households` is always populated** as `[{ _id, name, ownerId }]` in register/login/profile/update responses.
- **Household responses** (`owner`, `members`) contain **ids only**, never nested user objects.

---

## 4. Users & auth endpoints (`/users`)

### POST `/users/register` — rate 5/h/IP

Body: `{ username, email, password, householdName }`

- `username`: 3–30 chars, `^[a-zA-Z0-9_]+$`
- `email`: valid, normalized (lowercased, gmail-style dots/plus stripped by `normalizeEmail`)
- `password`: **12–128 chars**
- `householdName`: required (treat as ≤60 chars; length is only enforced on PATCH)

`201` → `{ message, user, accessToken, refreshToken? }` — also sets the `hearth_rt` cookie (web). Creates the user **and** their first household.
Errors: `400 BAD_REQUEST` (`"Validation failed: …"`), `409 CONFLICT` (username/email exists), `429 RATE_LIMITED`.

### POST `/users/login` — rate 10/15 min per (IP+email), failures only

Body: `{ email, password }` · `200` → `{ message, user, accessToken, refreshToken? }`
Errors: `401` `"Invalid email or password."` (identical for unknown email and wrong password — timing-safe too), `400`, `429`.

### POST `/users/refresh` — rate 60/15 min/IP, trusted-Origin only

Present token per §2. `200` → `{ message: "Token refreshed.", accessToken, refreshToken? }`.
Errors: `401 REFRESH_INVALID`, `403 CORS_FORBIDDEN`, `429`.

### POST `/users/logout` — trusted-Origin only

`204` empty body, `Set-Cookie` clears `hearth_rt`, server revokes the family. Mobile presents the token via `Authorization: Refresh <token>`.

### GET `/users/profile`

`200` → `{ user }`:

```json
{
  "user": {
    "_id": "…",
    "username": "…",
    "email": "…",
    "role": "member",
    "households": [{ "_id": "…", "name": "Home", "ownerId": "…" }],
    "createdAt": "…",
    "updatedAt": "…"
  }
}
```

`role` is informational only (always `"member"` — see §1 #19).

### GET `/users/:id` · PATCH `/users/:id` — **self only**

- Any id ≠ token's `userId` → `404` `"User not found."` (never 403 — no existence probing).
- PATCH body is strict: **only `{ username }`** (3–30, `^[a-zA-Z0-9_]+$`). Any other key (`role`, `isActive`, `households`, `password`, `email`) → `422 VALIDATION`.
- PATCH `200` → `{ message, user }`.

**Removed — will 404:** `GET /users`, `DELETE /users/:id`, `GET /users/refresh`.

---

## 5. Households (`/households`) — all require `Bearer`

### GET `/households` · `200` → `{ households: [...] }`

Each: `{ _id, name, owner: <userId>, members: [<userId>], createdAt, updatedAt }`.

### POST `/households` · body `{ name }`

`201` → **bare household object** (no wrapper — unlike every other household endpoint).
Note: no length validation on create today; `name` is required and trimmed. Use ≤60 chars to match PATCH.

### GET `/households/:id` — member, else `404`

`200` → `{ household }` (members/owner **populated in the DB then flattened to ids** by the response builder — ids only in JSON).

### PATCH `/households/:id` — **owner only** (member → `403`, outsider → `404`)

Body: `{ name }` — strict, 1–60 chars, trimmed. `200` → `{ household }`. `422` on empty/overlong/unknown keys. Invalid id in path → `400` (`"Invalid household ID."`).

### DELETE `/households/:id` — **owner only**

`200` → `{ message }`. Cascades: all devices and pending invitations in the household are deleted; every member loses the household; the Socket.IO household room is closed (live clients get no list event — re-fetch or watch `device:deleted`).

### POST `/households/invite` — **owner only**, rate 20/h/IP

Body: `{ householdId, inviteeEmail }` (strict; email lowercased/trimmed server-side).
`200` → `{ message: "If that address belongs to a Hearth user, they will see the invitation." }` — **identical for known and unknown emails** (no user enumeration). No invitation payload is returned.
Errors: `403` member-but-not-owner, `404` outsider, `422` invalid body.

### GET `/households/invitations` — your invite inbox

`200` → `{ invitations: [ { _id, household: { _id, name }, inviteeEmail, token, expiresAt, createdAt } ] }`

- Matched by **your email** (not by user id).
- Tokens expire **24 h** after creation (TTL-indexed; expired rows disappear shortly after). `POST …/accept` with an expired token → `404` `"Invalid or expired invitation token."` — check `expiresAt` client-side before offering the button.

### POST `/households/invitations/accept` · POST `/households/invitations/decline`

Body: `{ token }` (the token from the list above — `400` if missing).

- Accept `200` → `{ message, household }`. You are added as a member; **your live socket joins the household room immediately** (no reconnect needed).
- Decline `200` → `{ message }`.
- Wrong email / expired / unknown token → `404` `"Invalid or expired invitation token."`.

### POST `/households/leave`

Body: `{ householdId }`. **Members only** — the owner gets `403` `"Owners cannot leave their household; they must delete it instead."` (delete the household instead). `200` → `{ message }`; your socket leaves the room immediately. Outsiders → `404`.

---

## 6. Devices (`/devices`) — all require `Bearer`

Current document: `{ _id, name, type, status, household, owner, data: {}, createdAt, updatedAt }` (`__v` stripped). `status ∈ online | offline | unknown | pending`; new devices start **`unknown`**. `type` is a free lowercase string today.

| Method | Path                              | Success                     | Access check (current)                        |
| ------ | --------------------------------- | --------------------------- | --------------------------------------------- |
| POST   | `/devices`                        | `201` `{ message, device }` | member of `householdId` (else `403`)          |
| GET    | `/devices/household/:householdId` | `200` `{ devices: [...] }`  | member (else `403`)                           |
| GET    | `/devices/:id`                    | `200` `{ device }`          | member of the device's household (else `403`) |
| PATCH  | `/devices/:id`                    | `200` `{ message, device }` | member (else `403`)                           |
| DELETE | `/devices/:id`                    | `200` `{ message }`         | member (else `403`)                           |

Validation (current): create `{ name 1–50, type 1–30, householdId, data? object }`; update `{ name?, type?, status? (online/offline/unknown — clients currently *can* set it), data? object }`; path ids must be MongoIds.

Socket events emitted: `device:new` (on create), `device:update` (on patch, including the optimistic `status: "pending"`), `device:deleted` (on delete) — payload is the full device document (§10).

### ⚠️ Contract-locked changes landing in T7/T8 — do not build against current PATCH behaviour

- `data` will be **merged key-by-key**, not replaced wholesale.
- Per-type validation of `data` (brightness range, lock, thermostat, …).
- `expectedUpdatedAt` in the PATCH body → stale write returns **`409 CONFLICT`** (optimistic UI).
- Clients will **no longer** be able to set `status` directly.
- `pending` only when a real ack channel exists; command timeout → `unknown`; simulated devices stay `online` (today controls can get stuck on `pending` forever).
- Cursor pagination on the list endpoint: `?limit≤100&cursor=…`.

---

## 7. AI (`/ai`)

### POST `/ai/process` — `Bearer`, rate 10/min/**user**

Current: `200` → `{ actions: [...] }`.
⚠️ **Pending (T10):** rewrite to the AI Agent Safety Contract — minimal context, Zod-validated output, action allowlist, **no auto-unlock**, audit logging. Treat the action schema as unstable; the final shape will be published here.

---

## 8. Errors (complete)

```json
{ "error": { "code": "NOT_FOUND", "message": "Route not found." } }
```

| Code                | HTTP | Typical cause                                                                                                                                                  |
| ------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BAD_REQUEST`       | 400  | malformed JSON (`"Invalid JSON payload."`), register/login field validation (`"Validation failed: …"` — messages joined with `", "`), missing invitation token |
| `UNAUTHORIZED`      | 401  | missing/malformed Bearer, bad access token, bad credentials, missing refresh token                                                                             |
| `REFRESH_INVALID`   | 401  | refresh token unknown/rotated/stolen/expired → **hard logout**                                                                                                 |
| `FORBIDDEN`         | 403  | member-but-not-owner on owner-only routes; non-member on device routes (current)                                                                               |
| `CORS_FORBIDDEN`    | 403  | disallowed `Origin` (HTTP CORS or the refresh/logout origin guard)                                                                                             |
| `NOT_FOUND`         | 404  | unknown route, outsider on household routes, self-only user routes, dead invitation token                                                                      |
| `CONFLICT`          | 409  | username/email already registered                                                                                                                              |
| `PAYLOAD_TOO_LARGE` | 413  | body > 100 kb (`"Payload too large."`)                                                                                                                         |
| `VALIDATION`        | 422  | strict Zod schemas — message is `field: reason; field: reason` (e.g. `name: String must contain at least 1 character(s)`)                                      |
| `RATE_LIMITED`      | 429  | see §9                                                                                                                                                         |
| `INTERNAL`          | 500  | bug (`"An unexpected error occurred."` in production, real message in dev)                                                                                     |
| `UNAVAILABLE`       | 503  | reserved                                                                                                                                                       |

**Special messages to render as-is:** login failure, invite success, `"Invalid or expired invitation token."`, `"Owners cannot leave their household; they must delete it instead."`.
**Production 5xx never include stacks or internal messages.** 5xx and crashes are additionally reported to Sentry server-side (no effect on the response body).

---

## 9. Rate limits (all per-IP unless noted)

| Limiter  | Limit                                         | Endpoints                 |
| -------- | --------------------------------------------- | ------------------------- |
| Global   | 600 / 15 min                                  | everything                |
| Register | 5 / 1 h                                       | `POST /users/register`    |
| Login    | 10 / 15 min per **IP + email**, failures only | `POST /users/login`       |
| Refresh  | 60 / 15 min                                   | `POST /users/refresh`     |
| Invite   | 20 / 1 h                                      | `POST /households/invite` |
| AI       | 10 / 1 min per **user** (IP fallback)         | `POST /ai/process`        |

429 body: `{ error: { code: "RATE_LIMITED", message: "Too many requests. Please wait a moment and try again." } }`. Headers: `RateLimit` / `RateLimit-Policy` (draft-7) + `Retry-After` (seconds). Rate limiting is **disabled when `NODE_ENV=test`**.

---

## 10. Socket.IO (complete contract)

```ts
const socket = io(API_URL, {
  auth: { token: accessToken }, // required; short-lived access token
  transports: ["websocket", "polling"],
});
```

- **Handshake:** `auth.token` required; missing/invalid/expired → connection rejected (`Authentication error: …`). Cookies are **not** used (`credentials: false`; same CORS allowlist as HTTP, incl. the `403 CORS_FORBIDDEN` behaviour for unknown origins).
- **Rooms (server-managed, no client API):** on connect the server joins `user:<userId>` plus `household:<id>` for **every household in the DB at that moment** (membership is re-read from Mongo, not from the JWT or a stale user doc). Accepting an invitation joins the room live; leaving/deleting a household leaves it.
- **Server → client events (the only three):**

| Event            | Payload                                           | When                                                              |
| ---------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| `device:new`     | full device document                              | device created                                                    |
| `device:update`  | full device document (may be `status: "pending"`) | device patched (incl. optimistic pending), or MQTT status arrives |
| `device:deleted` | full device document                              | device deleted (incl. cascade on household delete)                |

- **Client → server events: none.** The server registers no inbound handlers; emits from the client are ignored (no acks).
- **Expiry:** the server disconnects the socket when the access token expires (`pingTimeout` = access-token TTL + 5 s). **After every silent refresh: disconnect + reconnect with the new token.**
- **Membership changes** (invite accepted, leave, household delete) apply to live sockets immediately — no reconnect needed for room membership itself.

---

## 11. Environments & configuration (things that will bite you)

| Item            | Value / behaviour                                                                                                                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prod API base   | `https://smart-home-api-c9r8.onrender.com` (no custom domain — ADR 8 deferred, revisit before v1.0.0)                                                                                                                                                |
| CORS allowlist  | Backend env `CORS_ORIGINS` (comma-separated exact origins) + `FRONTEND_URL`. **Until your Pages URL is set on Render, every browser request fails with `403 CORS_FORBIDDEN`** — including the socket handshake. Localhost origins must be added too. |
| Cookie SameSite | `COOKIE_SAMESITE` env, default `lax`. Cross-site (Pages↔Render are different sites) → Safari/ITP may break the cookie; accepted residual risk for now (revisit before v1.0.0).                                                                      |
| Cookie domain   | `COOKIE_DOMAIN` empty = host-only cookie.                                                                                                                                                                                                            |
| API docs        | `/api-docs` available **outside production only**.                                                                                                                                                                                                   |
| Health          | `GET /` (text), `GET /health` → `{ status: "UP", timestamp, message }`.                                                                                                                                                                              |
| Payload limit   | 100 kb → `413`.                                                                                                                                                                                                                                      |
| Request id      | `X-Request-Id` echoed on every response.                                                                                                                                                                                                             |
| Sentry          | Server-side only; enable via `SENTRY_DSN` env. Captures 5xx + crashes. **No frontend impact** (response bodies unchanged).                                                                                                                           |
| CI              | Every push/PR runs format → lint → typecheck → build → test (backend quality only; nothing changes for you).                                                                                                                                         |

---

## 12. Not implemented yet — do not build against these

| Item              | Locked contract                                                                                           | Target  |
| ----------------- | --------------------------------------------------------------------------------------------------------- | ------- |
| Device PATCH      | merge `data`, per-type validation, `expectedUpdatedAt` → `409`, clients can't set `status`                | T7/T8   |
| Device list       | cursor pagination (`limit` ≤ 100)                                                                         | T8      |
| Command lifecycle | `pending` only if ack exists; timeout → `unknown`; simulated devices stay `online`                        | T8/T9   |
| MQTT              | ack/heartbeat topics, offline detection                                                                   | T9      |
| `/ai/process`     | AI Agent Safety Contract (minimal context, Zod output, allowlists, **no auto-unlock**, rate limit, audit) | T10     |
| Members & account | richer member management, **ownership transfer**, `DELETE /users/me` + data export                        | T11     |
| Ops               | log/ops polish, Docker, CI hardening                                                                      | T12     |
| Phase 9           | sustained-offline webhook (HMAC), agent proposal surface, push tokens                                     | T13/T14 |

Any of these landing will be announced as an update to **this** file with the exact shapes.

---

## 13. Verification status

- Local gate (all green): `npm run format:check` · `npm run lint` · `npm run typecheck` · `npm run build` · `npm test` — **8 suites / 58 tests** (shared in-memory Mongo, `--runInBand`).
- CI (`.github/workflows/ci.yml`) runs the same five on every push and PR (Node 22 from `.nvmrc`).
- Suites backing this contract: `test/errors.test.ts` (envelope + Sentry no-op), `test/security-baseline.test.ts` (headers/CORS/413/sanitisation), `test/authorization-matrix.test.ts` (household + user matrix), `test/users.test.ts`, `test/refresh-sessions.test.ts` (rotation, reuse, transports, log hygiene), `src/routes/user.routes.test.ts`, `src/models/User.test.ts`, `src/routes/health.routes.test.ts`.
- Device rows in the authorization matrix and socket-event tests arrive with T8.

_Questions → cite the section number above, or the backend task id (T0–T14)._
