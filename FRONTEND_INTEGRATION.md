# Backend API — Frontend Integration Guide

Everything the frontend team needs to connect to the Smart Home Automation API.

---

## 1. Base Configuration

| Item                       | Value                                                  |
| -------------------------- | ------------------------------------------------------ |
| Base URL (local, Docker)   | `http://localhost:3000`                                |
| Content-Type               | `application/json`                                     |
| Interactive API docs       | `http://localhost:3000/api-docs` (Swagger UI)          |
| Health check               | `GET /health`                                          |
| Root welcome               | `GET /` (returns plain text)                           |
| Socket.IO                  | Same host/port, namespace `/`                          |
| MQTT broker (devices only) | `mqtt://localhost:1883` — **not used by the frontend** |

### CORS

- **HTTP CORS** (src/app.ts:21-29): allows only `http://localhost:5173` in development; in production uses `FRONTEND_URL` env var. `credentials: true` is enabled — send cookies.
- **Socket.IO CORS** (src/server.ts:17-25): allows `http://localhost:5173`, `http://localhost:3000`, `http://127.0.0.1:5500` in development. Methods `GET`, `POST`. `credentials: true`.

> Make sure your frontend runs on **`http://localhost:5173`** in dev or you'll get CORS errors.

### Rate Limiting (production only)

- 100 requests per IP per 15 minutes (src/app.ts:32-43).
- Standard `RateLimit-*` headers returned. No rate limit in development.

---

## 2. Authentication

### Model

Two-token JWT system:

1. **Access token** — JWT string, sent in the `Authorization` header on every protected request. Payload: `{ userId: string, role: "owner" | "member" }`. Default expiry `1h`.
2. **Refresh token** — JWT string, stored **only** in an `HttpOnly` cookie named **`jwt`**. Default expiry `7d`. Rotated on every refresh. Cookie flags: `httpOnly`, `sameSite: "strict"`, `secure` (production only).

### How to authenticate requests

```
Authorization: Bearer <accessToken>
```

### Required frontend fetch options

Because the refresh token lives in a cookie, **every auth call must send credentials**:

```js
fetch(url, { credentials: "include" }); // or axios: withCredentials: true
```

### Auth flow

1. `POST /users/register` or `POST /users/login` → response body contains `accessToken`; the refresh token is set automatically as the `jwt` cookie.
2. Store `accessToken` in memory (or storage of your choice). Attach as Bearer header.
3. When a request returns **401 "Access token expired"** (or "Invalid access token"), call `GET /users/refresh` (with credentials) to get a new `accessToken` and retry the failed request once.
4. `POST /users/logout` to invalidate the refresh token and clear the cookie.

### JWT payload for WebSocket auth

Socket.IO auth uses the same **access token** (verified with `JWT_SECRET`), see §7.

---

## 3. Conventions

### Success responses

Wrapping is **inconsistent per endpoint** — check each endpoint below for the exact shape. Common patterns:

- `{ message, user }`, `{ message, device }`, `{ message, household }`
- List endpoints: `{ users: [] }`, `{ devices: [] }`, `{ households: [] }`, `{ invitations: [] }`
- Some endpoints return the object bare (e.g. `POST /households` returns the household object directly).

### Error responses

All errors (src/app.ts:126-143) use this shape:

```json
{
  "error": {
    "message": "Human-readable error message"
  }
}
```

In development, `error.stack` is also included. In production, unexpected errors return the generic message `"An unexpected error occurred."`.

### Common status codes

| Code | Meaning                                                                              |
| ---- | ------------------------------------------------------------------------------------ |
| 200  | OK                                                                                   |
| 201  | Created                                                                              |
| 204  | No content (logout)                                                                  |
| 400  | Validation error / bad request — `error.message` contains joined validation messages |
| 401  | Not authenticated, missing/malformed/expired token                                   |
| 403  | Authenticated but not allowed (not owner, not household member)                      |
| 404  | Resource not found                                                                   |
| 409  | Conflict (e.g. duplicate email)                                                      |
| 500  | Server error                                                                         |
| 503  | AI service unavailable                                                               |

### IDs

All IDs (`_id`, `householdId`, `userId`, `token`, etc.) are strings. Mongo IDs are validated as `isMongoId()` — sending anything else returns 400.

### Roles

- `owner` — admin role. Can list/delete users, invite to households, delete/update households.
- `member` — default role. Can manage own profile, devices in their households.

Roles are **global per user**, but households also have an `owner` field. For household operations the API checks ownership of that specific household.

---

## 4. REST Endpoints

### Health

| Method | Path      | Auth | Description                            |
| ------ | --------- | ---- | -------------------------------------- |
| GET    | `/`       | none | Plain-text welcome message             |
| GET    | `/health` | none | `{ status: "UP", timestamp, message }` |

---

### Users & Auth (`/users`)

| Method | Path              | Auth                   | Description                                              |
| ------ | ----------------- | ---------------------- | -------------------------------------------------------- |
| POST   | `/users/register` | none                   | Register a new user **and** create their first household |
| POST   | `/users/login`    | none                   | Login                                                    |
| GET    | `/users/refresh`  | cookie                 | Rotate refresh token → new access token                  |
| POST   | `/users/logout`   | cookie                 | Invalidate refresh token, clear cookie                   |
| GET    | `/users`          | Bearer + `owner`       | List all active users                                    |
| GET    | `/users/:id`      | Bearer (self or owner) | Get one user                                             |
| PATCH  | `/users/:id`      | Bearer (self or owner) | Update user                                              |
| DELETE | `/users/:id`      | Bearer + `owner`       | Soft-delete a user (not yourself)                        |

#### POST `/users/register`

Request:

```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "secret123",
  "householdName": "My Home"
}
```

Validation: username 3–30 chars, letters/numbers/underscores only; valid email; password ≥ 8 chars; `householdName` required.

Response `201`:

```json
{
  "message": "User registered successfully and household created.",
  "user": {
    "_id": "...",
    "username": "...",
    "email": "...",
    "role": "member",
    "households": [{ "_id": "...", "name": "My Home" }]
  }
}
```

> Password, `__v`, and `isActive` are stripped from user responses. Households embedded in user objects are cleaned of `owner`, `members`, timestamps.

#### POST `/users/login`

Request: `{ "email": "john@example.com", "password": "secret123" }`

Response `200`:

```json
{
  "message": "Login successful.",
  "user": { "...": "..." },
  "accessToken": "eyJhbGciOi..."
}
```

Also sets the `jwt` HttpOnly cookie. Store `accessToken`; do not touch the cookie manually.

#### GET `/users/refresh`

No body — reads the `jwt` cookie (send `credentials: "include"`).

Response `200`:

```json
{
  "message": "Access token refreshed successfully.",
  "accessToken": "eyJhbGciOi...",
  "user": { "userId": "60f...", "role": "member" }
}
```

Also sets a new rotated `jwt` cookie. `401` if cookie missing/invalid/expired.

> **Note:** the route is registered as `GET /users/refresh` (src/routes/user.routes.ts:15). Call it with method GET.

#### POST `/users/logout`

Response `204` (empty body). Clears the `jwt` cookie. Returns `204` even if no cookie was present.

#### GET `/users` (owner only)

Response `200`: `{ "users": [ { "...": "..." } ] }` — array of cleaned user objects.

#### GET `/users/:id`

Response `200`: `{ "user": { "...": "..." } }`. Non-owners can only fetch their own ID → otherwise `403`.

#### PATCH `/users/:id`

Request (all fields optional):

```json
{
  "username": "new_name",
  "email": "new@example.com",
  "role": "member"
}
```

Validation: same as register for provided fields. `role` must be `owner` or `member`.

Response `200`: `{ "message": "User updated successfully.", "user": { "...": "..." } }`

#### DELETE `/users/:id` (owner only)

Response `200`: `{ "message": "User soft-deleted successfully." }`. Owners cannot delete themselves.

---

### Households (`/households`)

All routes require Bearer auth (router-level `authenticate`).

| Method | Path                              | Extra auth          | Description                                   |
| ------ | --------------------------------- | ------------------- | --------------------------------------------- |
| GET    | `/households`                     | —                   | List households the user belongs to           |
| POST   | `/households`                     | —                   | Create a household (user becomes owner)       |
| GET    | `/households/:id`                 | member of household | Get one household                             |
| PATCH  | `/households/:id`                 | owner of household  | Update household name                         |
| DELETE | `/households/:id`                 | owner of household  | Delete household + devices + invitations      |
| POST   | `/households/invite`              | owner of household  | Invite a user by email                        |
| GET    | `/households/invitations`         | —                   | List pending invitations for the current user |
| POST   | `/households/invitations/accept`  | —                   | Accept an invitation by token                 |
| POST   | `/households/invitations/decline` | —                   | Decline an invitation by token                |
| POST   | `/households/leave`               | member (not owner)  | Leave a household                             |

> **Route order caveat:** `/households/invitations`, `/households/leave`, `/households/invite` are registered before `/:id`, so no conflicts.

#### GET `/households`

Response `200`:

```json
{
  "households": [
    {
      "_id": "60f...",
      "name": "My Home",
      "owner": "60f...",
      "members": ["60f...", "60f..."],
      "devices": ["60f..."],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

`owner` and `members` are returned as **ID strings** (not populated objects).

#### POST `/households`

Request: `{ "name": "My New Home" }` — `name` required (400 if missing).

Response `201`: **bare household object** (not wrapped):

```json
{
  "_id": "...",
  "name": "My New Home",
  "owner": "...",
  "members": ["..."],
  "devices": [],
  "createdAt": "...",
  "updatedAt": "..."
}
```

#### GET `/households/:id`

Response `200`: `{ "household": { "...": "same shape as above" } }`. `:id` must be a Mongo ID → else `400`.

#### PATCH `/households/:id`

Request: `{ "name": "New Name" }` — no ownership check in the controller (only route-level auth + Mongo ID validation). Response `200`: **bare household object**.

> **Frontend note:** enforce/guard owner-only UI yourself for this endpoint; backend currently does not verify ownership on PATCH.

#### DELETE `/households/:id` (owner)

Response `200`: `{ "message": "Household and all associated data deleted successfully." }`. Cascades: deletes all devices and invitations of the household.

#### POST `/households/invite` (owner only)

Request:

```json
{
  "householdId": "60f...",
  "inviteeEmail": "friend@example.com"
}
```

Response `201`: `{ "message": "Invitation sent to friend@example.com.", "invitation": { "...": "..." } }`

Invitation object shape:

```json
{
  "_id": "...",
  "household": "60f...",
  "inviter": "60f...",
  "inviteeEmail": "friend@example.com",
  "token": "<ACCESS_TOKEN>",
  "expiresAt": "2026-...Z",
  "createdAt": "...",
  "updatedAt": "..."
}
```

Invitation token expires in **24 hours**. Errors: `403` if not owner or invitee already a member; `404` if household not found.

#### GET `/households/invitations`

Returns pending, non-expired invitations where `inviteeEmail` matches the current user's email.

Response `200`: `{ "invitations": [ { "...": "Invitation object above" } ] }`

#### POST `/households/invitations/accept`

Request: `{ "token": "a1b2c3..." }`

Response `200`:

```json
{
  "message": "Invitation accepted successfully.",
  "household": { "...": "household object" }
}
```

`404` if token invalid/expired or email mismatch.

#### POST `/households/invitations/decline`

Request: `{ "token": "a1b2c3..." }`

Response `200`: `{ "message": "Invitation declined successfully." }`

#### POST `/households/leave`

Request: `{ "householdId": "60f..." }`

Response `200`: `{ "message": "Successfully left the household." }`. Owners cannot leave (`403`) — they must delete the household.

---

### Devices (`/devices`)

All routes require Bearer auth (router-level `authenticate`).

| Method | Path                              | Description                                             |
| ------ | --------------------------------- | ------------------------------------------------------- |
| POST   | `/devices`                        | Create a device in a household                          |
| GET    | `/devices/household/:householdId` | List devices in a household                             |
| GET    | `/devices/:id`                    | Get one device                                          |
| PATCH  | `/devices/:id`                    | Update a device (sends MQTT command if `data` provided) |
| DELETE | `/devices/:id`                    | Delete a device                                         |

Access rule: user must be a **member of the device's household** for everything (`403` otherwise).

#### Device object

```json
{
  "_id": "60f...",
  "name": "Living Room Light",
  "type": "light",
  "status": "unknown",
  "household": "60f...",
  "owner": "60f...",
  "data": { "on": false, "brightness": 50 },
  "createdAt": "...",
  "updatedAt": "..."
}
```

- `type`: free string, lowercased by the backend. Known/used examples: `light`, `thermostat`, `sensor`. No enum restriction.
- `status`: enum — `online` | `offline` | `unknown` | `pending`. Default `unknown`. `pending` is set automatically after you send a command via `data`.
- `data`: arbitrary JSON object (Mixed). Convention for lights: `{ on: boolean, brightness: number }`.

#### POST `/devices`

Request:

```json
{
  "name": "Living Room Light",
  "type": "light",
  "householdId": "60f...",
  "data": { "on": false, "brightness": 50 }
}
```

Validation: `name` 1–50 chars, `type` 1–30 chars, `householdId` valid Mongo ID, `data` optional object.

Response `201`: `{ "message": "Device created successfully.", "device": { "...": "Device object" } }`

Emits Socket.IO event `device:new` to the household room.

#### GET `/devices/household/:householdId`

Response `200`: `{ "devices": [ { "...": "..." } ] }`

#### GET `/devices/:id`

Response `200`: `{ "device": { "...": "..." } }`

#### PATCH `/devices/:id`

Request (all optional):

```json
{
  "name": "Main Bedroom Light",
  "type": "light",
  "status": "online",
  "data": { "on": true, "brightness": 80 }
}
```

Validation: `status` must be one of `online|offline|unknown` (note: `pending` is **not** accepted as an input value, even though it exists as a state).

**Important behavior:** if you send `data`, the backend publishes the command to the physical device over MQTT and immediately sets `status: "pending"`. The real final state (e.g. `online`) arrives asynchronously via Socket.IO `device:update` when the device confirms. Do **not** optimistically set `status` yourself — wait for the socket event.

Response `200`: `{ "message": "Device updated successfully.", "device": { "...": "updated device, possibly with status pending" } }`

Emits Socket.IO event `device:update` to the household room.

#### DELETE `/devices/:id`

Response `200`: `{ "message": "Device deleted successfully." }`. No socket event is emitted on delete.

---

### AI (`/ai`)

| Method | Path          | Auth   | Description                                            |
| ------ | ------------- | ------ | ------------------------------------------------------ |
| POST   | `/ai/process` | Bearer | Convert a natural-language command into device actions |

#### POST `/ai/process`

Request:

```json
{
  "prompt": "turn off the living room light",
  "devices": [
    { "_id": "60f...", "name": "Living Room Light", "data": { "on": true } }
  ]
}
```

- `devices` is the **current list of devices from the client** (full device objects as returned by `/devices`). The backend only uses `_id`, `name`, and `data.on`.

Response `200`:

```json
{
  "actions": [{ "id": "60f...", "action": "off" }]
}
```

`actions` is a validated subset of what the AI returned — every `action.id` is guaranteed to exist in the `devices` array you sent. Typical action values: `"on"`, `"off"`, or other command payloads.

**Frontend responsibility:** apply the returned actions yourself by calling `PATCH /devices/:id` with `{ "data": { "on": false } }` (or equivalent). The AI endpoint does not modify devices.

Errors: `500` if `GEMINI_API_KEY` missing or AI response unparsable; `503` if the upstream AI service errors.

---

## 5. Validation Rules (quick reference)

| Field                    | Rule                                                           |
| ------------------------ | -------------------------------------------------------------- |
| `username`               | required on register; 3–30 chars; `^[a-zA-Z0-9_]+$`            |
| `email`                  | valid email; normalized (lowercased, gmail dots removed, etc.) |
| `password`               | required on register/login; min 8 chars                        |
| `householdName`          | required on register (non-empty)                               |
| `role`                   | optional on update; `owner` \| `member`                        |
| device `name`            | 1–50 chars                                                     |
| device `type`            | 1–30 chars                                                     |
| device `status` (input)  | `online` \| `offline` \| `unknown`                             |
| all `*Id` / `:id` params | valid MongoDB ObjectId                                         |
| invitation `token`       | non-empty string                                               |

Validation errors return `400` with all failed messages joined in `error.message`, e.g.:

```json
{
  "error": {
    "message": "Validation failed: Username is required, Password must be at least 8 characters long"
  }
}
```

---

## 6. Key Response Object Shapes

### User (as returned by API)

```json
{
  "_id": "60f...",
  "username": "john_doe",
  "email": "john@example.com",
  "role": "member",
  "households": [{ "_id": "60f...", "name": "My Home" }],
  "createdAt": "...",
  "updatedAt": "..."
}
```

(`password`, `isActive`, `__v` are always stripped. Embedded households are stripped of `owner`, `members`, `devices`, timestamps.)

### Household

```json
{
  "_id": "60f...",
  "name": "My Home",
  "owner": "60f...",
  "members": ["60f...", "60f..."],
  "devices": ["60f..."],
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Device

```json
{
  "_id": "60f...",
  "name": "Living Room Light",
  "type": "light",
  "status": "online",
  "household": "60f...",
  "owner": "60f...",
  "data": { "on": true, "brightness": 80 },
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Invitation

```json
{
  "_id": "60f...",
  "household": "60f...",
  "inviter": "60f...",
  "inviteeEmail": "friend@example.com",
  "token": "64-hex-char-string",
  "expiresAt": "2026-10-11T12:00:00.000Z",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## 7. Real-Time (Socket.IO)

Socket.IO v4 is served from the **same HTTP server/port** as the REST API (`http://localhost:3000`).

### Connecting

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  auth: { token: accessToken }, // the Bearer access token
  withCredentials: true,
});
```

Authentication (src/realtime/socket.ts:23-52): pass the **access token** in `auth.token`. The server verifies it with `JWT_SECRET` and looks up the user. Connection is rejected with an `Authentication error` if the token is missing/invalid/user not found.

### Rooms

On connect, the server automatically joins the socket to a room named after **each household ID** the user belongs to. You don't need to join manually. Events are broadcast per household.

> If the user joins/accepts an invitation into a new household **while already connected**, they will need to reconnect to be joined to the new room.

### Events received

| Event           | Payload            | When                                                                                                             |
| --------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `device:new`    | full Device object | A device was created in one of your households                                                                   |
| `device:update` | full Device object | A device was updated, a command was sent (status `pending`), or a physical device reported a new status via MQTT |

The payload is the full device document (without `__v`):

```json
{
  "_id": "...",
  "name": "Living Room Light",
  "type": "light",
  "status": "pending",
  "household": "...",
  "owner": "...",
  "data": { "on": true },
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Events sent

None. The socket connection is receive-only from the frontend's perspective — all mutations go through REST.

### Recommended frontend handling

```js
socket.on("connect", () => console.log("connected", socket.id));
socket.on("connect_error", (err) => console.error(err.message));

socket.on("device:new", (device) => {
  /* add to household device list */
});
socket.on("device:update", (device) => {
  // upsert device in state; watch status transitions:
  // pending → online/offline (command acknowledged by hardware)
});
```

When `status` goes `pending`, keep showing the optimistic state but disable controls until a follow-up `device:update` with `online`/`offline`/`unknown` arrives.

---

## 8. End-to-End Flows

### Register / Login

```
POST /users/register  →  201 { user } + jwt cookie set
   (or POST /users/login → 200 { user, accessToken } + jwt cookie)
Store accessToken.
GET  /households      →  pick a household
GET  /devices/household/:id  →  render devices
Connect Socket.IO with auth.token = accessToken
```

### Control a device

```
PATCH /devices/:id  { "data": { "on": true, "brightness": 100 } }
  → 200 { device with status: "pending" }
  → socket "device:update" with status pending (immediate)
  → socket "device:update" with status online (when hardware confirms)
```

### Refresh an expired access token

```
Any request → 401 { error: { message: "Access token expired" } }
GET /users/refresh (credentials: include) → 200 { accessToken }
Retry original request with new accessToken
```

### AI voice/text command

```
POST /ai/process { prompt, devices }  →  { actions: [{ id, action }] }
For each action: PATCH /devices/:id with the corresponding data change
Listen for socket device:update
```

---

## 9. Environment / Backend Notes

Backend env vars (frontend doesn't set these, but useful context):

| Var                        | Example                      | Notes                                                       |
| -------------------------- | ---------------------------- | ----------------------------------------------------------- |
| `PORT`                     | `3000`                       | API + Socket.IO port                                        |
| `NODE_ENV`                 | `development` / `production` | Controls CORS, rate limit, cookie `secure`, error verbosity |
| `FRONTEND_URL`             | `https://yourdomain.com`     | Production CORS origin                                      |
| `ACCESS_TOKEN_EXPIRES_IN`  | `1h`                         |                                                             |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d`                         | Also cookie maxAge                                          |
| `GEMINI_API_KEY`           | —                            | Required for `/ai/process`; missing → 500                   |

Things to remember:

- **No pagination** anywhere — all list endpoints return everything.
- **No search/filter query params** on any endpoint.
- `GET /users/refresh` is a **GET**, not POST.
- Logout returns **204 No Content** (empty body), not JSON.
- `POST /households` and `PATCH /households/:id` return the **bare object**, not wrapped in `household:`.
- Device `status: "pending"` is a real state the UI should render.
- Delete device emits **no** socket event — remove it from UI state yourself after a successful `DELETE`.
- Swagger UI at `/api-docs` is the live source of truth if this doc and the API drift.
