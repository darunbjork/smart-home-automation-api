# Week 1, Day 4 — Security Infrastructure: JWT Authentication with Refresh Token Rotation and Authorization Middleware

## Learning Objective Achieved

Today, we implemented **JSON Web Token (JWT) based authentication** with an advanced **refresh token rotation strategy**. This involved issuing, verifying, and managing JWTs for access control, and using refresh tokens to enhance security and user experience. Crucially, we implemented **authentication and authorization middleware** to protect our API endpoints, ensuring only legitimate and authorized users can access specific resources.

## Design Decisions & Tradeoffs

1.  **JWT (JSON Web Token) for Authentication:**
    *   **Why:** Stateless, compact, and self-contained, ideal for scalable, distributed systems. Reduces database lookups, improving performance.
    *   **Alternatives Rejected:** Session-based (adds complexity for scaling, CSRF vulnerability), API Keys (less suitable for user auth).

2.  **JWT Access Token (Short-lived) & Refresh Token (Long-lived) Strategy:**
    *   **Why:** Best-practice security pattern. Short-lived access tokens minimize vulnerability window. Long-lived refresh tokens (HttpOnly cookies) improve UX and are less susceptible to XSS.
    *   **Refresh Token Rotation:** Each use invalidates the old token and issues a new one, significantly enhancing security against token theft.
    *   **Alternatives Rejected:** Only short-lived (poor UX), only long-lived (high security risk).

3.  **Storing Refresh Tokens in Database & Blacklisting:**
    *   **Why:** Enables refresh token rotation and revocation (e.g., forced logout). Provides server-side control over token validity.
    *   **Alternatives Rejected:** Pure stateless JWTs (no revocation), client-side refresh token storage (XSS vulnerable).

4.  **Middleware for Authentication and Authorization:**
    *   **Why:** Centralizes logic for route protection. Authentication verifies tokens and attaches user data. Authorization checks roles/permissions (Role-Based Access Control - RBAC).
    *   **Alternatives Rejected:** Inline logic (repetitive, error-prone, hard to maintain).

## Implementation Details

*   **`package.json`:** Added `jsonwebtoken` and `cookie-parser` dependencies.
*   **`.env`:** Configured `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ACCESS_TOKEN_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`.
*   **`src/config/env.ts`:** Updated to load new JWT environment variables.
*   **`src/models/RefreshToken.ts`:** New Mongoose model to store refresh tokens with `userId`, `token`, and `expiresAt`. Includes a TTL (Time-To-Live) index on `expiresAt` for automatic cleanup and a unique index on `token`.
*   **`src/services/auth.service.ts`:**
    *   Handles `generateAccessToken`, `generateRefreshToken` (saves to DB).
    *   `verifyAccessToken` for access token validation.
    *   `verifyAndRotateRefreshToken` (core of rotation logic: verifies old token, deletes it from DB, generates and saves new access and refresh tokens).
    *   `invalidateRefreshToken` (deletes token from DB for logout).
*   **`src/services/user.service.ts`:**
    *   Modified `loginUser` to return `accessToken` and `refreshToken`.
    *   `registerUser` now accepts an optional `role` parameter (defaults to "member").
*   **`src/middleware/auth.middleware.ts`:**
    *   `authenticate`: Verifies access token from `Authorization` header, attaches `req.user`.
    *   `authorize`: Higher-order function that takes required roles, checks `req.user.role` against them, enforcing RBAC.
*   **`src/controllers/user.controller.ts`:**
    *   `loginUser`: Sets `refreshToken` as `HttpOnly` cookie, returns `accessToken` in body.
    *   New endpoints: `refreshAccessToken` (handles token rotation via cookie), `logoutUser` (clears cookie and invalidates token).
    *   Authorization checks added to `getUserById`, `updateUser`, `deleteUser` (e.g., users can only view/update their own profile unless owner; only owner can soft-delete users).
*   **`src/routes/user.routes.ts`:**
    *   Added `/refresh` and `/logout` routes.
    *   Protected user management routes (`/users`, `/users/:id`) with `authenticate` and `authorize` middleware.
*   **`src/app.ts`:**
    *   Integrated `cookie-parser` middleware.
    *   Updated CORS configuration to allow `credentials: true`.
    *   Updated Swagger definitions to include `bearerAuth` security scheme and `Forbidden` response.

## Issues Faced & Resolutions

1.  **`ECONNRESET` during initial `curl` requests:**
    *   **Issue:** Connection reset by peer, often due to server not being ready or port mismatch.
    *   **Resolution:**
        *   Corrected `docker-compose.yml` port mapping from `4000:4000` to `3000:3000` for the `api` service.
        *   Removed redundant `PORT=${PORT}` from `api` service `environment` in `docker-compose.yml` to ensure internal container port matches `.env`.
        *   Implemented `sleep` delays before `curl` commands to allow server full initialization. For production, a proper Docker healthcheck for the API service would be implemented.

2.  **HTML error page instead of JSON response:**
    *   **Issue:** Express's default HTML error handler was being used instead of our custom JSON error handler.
    *   **Resolution:** Corrected the signature of the global error handling middleware in `src/app.ts` to include `next: NextFunction` as the fourth argument: `app.use((err: Error, req: Request, res: Response, next: NextFunction) => { ... });`. Also ensured `NextFunction` was imported from `express`.

3.  **TypeScript errors (`Duplicate identifier 'IUser'`, `Property '__v' does not exist on type 'IHousehold'`) and ESLint warnings (`no-explicit-any`, `no-unused-vars`):**
    *   **Issue:** Type mismatches, duplicate imports, and unused variable warnings.
    *   **Resolution:**
        *   Removed duplicate `IUser` import in `src/services/user.service.ts`.
        *   Added `__v?: number;` to `IHousehold` interface in `src/types/user.d.ts` for Mongoose version key.
        *   Replaced `any` with `unknown` in `catch` blocks and used type narrowing (`instanceof Error`).
        *   Updated `eslint.config.js` to configure `@typescript-eslint/no-unused-vars` to ignore variables prefixed with `_` (`varsIgnorePattern: '^_+'`).
        *   Renamed `next` to `_next` in error handler signature to satisfy ESLint.

4.  **Owner/Member users always registered with `role: "owner"`:**
    *   **Issue:** Despite code changes, newly registered users (including members) were consistently getting the "owner" role.
    *   **Root Cause:** A hardcoded `role: "owner"` was mistakenly left in the `User` constructor within `src/services/user.service.ts`.
    *   **Resolution:** Changed `role: "owner"` to `role: _role` in `src/services/user.service.ts`'s `registerUser` function.
    *   **Testing Methodology Issue:** The user was often testing by re-registering the same user without clearing the database, leading to confusion as the existing user (registered with the old hardcoded "owner" role) was being retrieved. Emphasized the need for `docker-compose down -v` for clean test runs.

5.  **Refresh Token Rotation not working (old token still valid):**
    *   **Issue:** After a successful refresh, the "old" refresh token could still be used to obtain new access tokens, despite logs showing `deletedCount: 1`.
    *   **Root Cause:** The `RefreshToken.deleteOne` operation was indeed successful, but the user's testing methodology was flawed. They were likely not using the *exact* old token for the subsequent test, or their client-side cookie handling was not correctly updating the cookie jar.
    *   **Resolution:** Provided extremely precise, step-by-step `curl` commands for the refresh token rotation test, emphasizing:
        *   Complete database clear (`docker-compose down -v`).
        *   Careful extraction of the *initial* refresh token from the `Set-Cookie` header.
        *   Using *only* that `INITIAL_REFRESH_TOKEN` for the "old token" test, ensuring no new cookies were sent.
    *   **Confirmation:** Successfully demonstrated that when tested correctly, the old refresh token *does* become invalid, resulting in a `401 Unauthorized` response.

## Validation Steps

Comprehensive validation was performed throughout the development process:

1.  **Docker Compose Services Startup:** Verified successful startup and MongoDB connection.
2.  **User Registration:** Tested registration of owner and member users, confirming correct role assignment.
3.  **Authentication:**
    *   Tested protected routes without token (401 Unauthorized).
    *   Tested with invalid/junk tokens (401 Unauthorized).
    *   Tested with valid access tokens (200 OK).
4.  **Authorization (RBAC):**
    *   **`GET /users`:** Tested owner access (200 OK) and member access (403 Forbidden).
    *   **`GET /users/:id`:** Tested member accessing own profile (200 OK) and member accessing other user's profile (403 Forbidden). Tested owner accessing any profile (200 OK).
    *   **`DELETE /users/:id`:** Tested owner access (200 OK) and member access (403 Forbidden).
5.  **Refresh Token Rotation:**
    *   Logged in to obtain initial refresh token.
    *   Performed first refresh, verifying new access token and new refresh token were issued.
    *   **Crucially:** Attempted to use the *initial* refresh token again, confirming `401 Unauthorized` response and server logs showing successful deletion.
6.  **Logout:** Tested invalidation of refresh tokens upon logout.

## Senior Engineering Lessons

*   **Importance of Clean Test Environment:** Persistent data can mask bugs. `docker-compose down -v` is essential for reliable testing.
*   **Debugging Asynchronous Operations:** `ECONNRESET` often points to timing issues or server crashes. Longer delays or healthchecks are crucial.
*   **Error Handling Middleware Signature:** The `(err, req, res, next)` signature is non-negotiable for Express error handlers.
*   **Type Safety and ESLint:** Rigorous typing (`IUser`, `IHousehold`, `unknown` for errors) and ESLint rules (`no-explicit-any`, `no-unused-vars`) are vital for code quality and catching subtle bugs.
*   **Deep Dive into Refresh Token Rotation:** Understanding that `deletedCount: 1` in logs means the token was removed, and that client-side cookie handling is paramount for correct rotation testing. The "old token" test is the definitive check.
*   **Attention to Detail in Code:** A single hardcoded value (`role: "owner"`) can undermine complex logic.

## Knowledge Gaps Identified

*   Full integration of Swagger UI for API documentation visualization.
*   Deeper exploration of JWT best practices (key management, token revocation strategies beyond simple deletion).
*   Research into more complex permission-based (ACL) authorization systems for fine-grained control.
*   Implementing a proper Docker healthcheck for the API service to avoid manual `sleep` delays in tests.
*   Adding unit and integration tests for the newly implemented security features.