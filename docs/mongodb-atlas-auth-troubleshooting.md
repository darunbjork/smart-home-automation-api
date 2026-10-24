# Troubleshooting MongoDB Atlas Connection Failures

## Introduction

This document covers the `bad auth : Authentication failed` / `ENOTFOUND` errors hit when switching the API from local Docker MongoDB to MongoDB Atlas, and how each one was isolated. The `.env` file itself was never opened during diagnosis — everything was derived from server logs plus a silent diagnostic that prints only non-secret fields.

## Symptoms

Observed while running `npm start` (the process exits on any DB failure, see `src/config/db.ts:42`):

| #   | Error                                                                                                              | Meaning                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 1   | `code: 8000, codeName: "AtlasError", errmsg: "bad auth : Authentication failed."`                                  | Atlas reachable, credentials rejected                                             |
| 2   | `code: "ENOTFOUND", hostname: "_mongodb._tcp.cluster.mongodb.net"`                                                 | The SRV host in `MONGO_URI` does not exist — a placeholder was left in the string |
| 3   | `code: 8000, codeName: "AtlasError", errmsg: "bad auth : authentication failed"` (again, after the host was fixed) | Host now correct; username/password pair still wrong                              |

Other symptoms in the same boot log (separate, non-blocking issues):

- `GEMINI_API_KEY is missing...` printed at import time by `src/controllers/ai.controller.ts:17` even when `AI_ENABLED=false`, and via `console.error` instead of the pino logger.
- `Invalid Sentry Dsn: "..."` followed by `Sentry error reporting enabled.` — `initSentry` in `src/config/sentry.ts:19` sets `initialised = true` and logs success **before** validating that the SDK accepted the DSN. The DSN in `.env` also carried a trailing comma.

## Root Cause Analysis

Each failure had a distinct cause; they surfaced one at a time as each layer was fixed:

1. **Placeholder host left in the connection string.** The URI pointed at `cluster.mongodb.net` (the generic example host) instead of the real cluster `myflixdb.cvyoejv.mongodb.net`. Node's SRV resolver therefore queried `_mongodb._tcp.cluster.mongodb.net`, which has no DNS record → `ENOTFOUND`.
2. **Credential mismatch against Atlas.** Once the host resolved, the handshake reached Atlas and was rejected with code `8000`. A silent diagnostic proved the URI was _syntactically perfect_ (parses correctly, 20-character password, no raw special characters, no double-encoding, no whitespace, `mongodb+srv` scheme, `?retryWrites=true&w=majority` options). Since string formatting was ruled out, the only remaining explanation was that Atlas stored a different username/password than the ones supplied.
3. **Console login ≠ database user.** The most common cause of the above: authenticating with the Atlas _cloud console_ account (email/password used to log into cloud.mongodb.com) instead of a purpose-created _database user_ under **Database Access → Database Users**. Console credentials are never accepted by the database endpoint and always return the same generic `bad auth`.
4. **IP allowlist ruled out.** A blocked IP fails with a connection timeout or `code 90`, not `8000`. Because the auth handshake completed and returned `AtlasError`, **Network Access was never the problem**.

## Step-by-Step Solution

### 1. Reproduce and read the exact failure

```bash
npm start   # logs to stdout; process exits with code 1 on DB failure
```

Do not assume the first error is the real one — fix it and rerun; the next layer of failure appears.

### 2. Fix the connection string host

In `.env` (edited by the operator only):

```
MONGO_URI=mongodb+srv://<USER>:<PASSWORD>@<CLUSTER>/<DB>?retryWrites=true&w=majority
```

- Host must be the **real** cluster SRV hostname from Atlas → _Connect → Drivers_.
- Password must be **URL-encoded** if it contains any of `@ : / % # +` — otherwise the driver parses them as delimiters and authenticates with a truncated password.

### 3. Run the silent diagnostic (never prints the password)

Rather than reading `.env` by hand, load it programmatically and report only non-secret facts:

```bash
node uri-diag.js
```

It reports: scheme, username, password _length_, whether the password contains raw special characters or looks double-encoded, host, db in path, query params, and a `CONNECT: SUCCESS/FAILED` verdict with the Atlas error code. Example output from the failing state:

```
scheme: mongodb+srv
username: darunbjork (len 10)
password_length: 20
password_has_raw_special_chars: none
host: myflixdb.cvyoejv.mongodb.net
query_params: retryWrites,w
CONNECT: FAILED
error_code: 8000  error_codeName: AtlasError
error_message: bad auth : authentication failed
```

This proves the string is well-formed and shifts the investigation to the Atlas side.

### 4. Reconcile credentials on the Atlas side

1. Atlas → **Database Access → Database Users**.
2. Confirm a user exists with the _exact_ username in `MONGO_URI` (e.g. `darunbjork`) — a console-only account will not work.
3. Reset that user's password, or update `MONGO_URI` so both match.
4. Prefer a **plain alphanumeric password** while debugging to eliminate all encoding variables.
5. Role: _Read and write to any database_; Authentication method: Password.

### 5. Verify

```bash
npm start
# expected:
# [INFO] MongoDB Connected successfully.
# [INFO] MQTT Broker is running on port 1883
# [INFO] Server is running on port 3000
curl -s localhost:3000/health
# {"status":"UP",...}
```

## Fallback

A local MongoDB container stays available while Atlas is being sorted out:

```bash
docker start smart-home-db          # mongo:6.0 on localhost:27017
# in .env: MONGO_URI=mongodb://localhost:27017/smarthome
npm start
```

## Related Observations (non-blocking)

- `src/config/db.ts:42` calls `process.exit(1)` on the first failed connect — there is no retry/backoff, so a transient Atlas hiccup kills the process.
- `initSentry` should validate the DSN (and reject trailing commas) before logging "Sentry error reporting enabled."
- The `GEMINI_API_KEY` warning should be gated on `AI_ENABLED` and routed through the pino logger.
- Credentials were pasted into a chat transcript during debugging; treat the connection string as exposed and rotate the database password after resolving.
