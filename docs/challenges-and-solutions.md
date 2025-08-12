# Challenges Faced and Solutions Implemented

This document outlines the key technical challenges encountered during the development of the smart-home-automation-api and the solutions implemented to address them.

## 1. MongoDB Replica Set Initialization Issues

### Challenges:
*   **API started before replica set was ready:** The API service, running in Docker, would often attempt to connect to MongoDB before the replica set was fully initialized and a primary node elected. This led to connection errors and application startup failures.
*   **`init-mongo.sh` failed or exited early:** The initial `init-mongo.sh` script, responsible for initiating the MongoDB replica set within the Docker environment, was not robust. It sometimes failed or exited prematurely, leaving the replica set in an uninitialized or unhealthy state.
*   **Replica set had no primary:** Even when `rs.initiate()` was called, the replica set occasionally failed to elect a primary, which is crucial for write operations and overall functionality.

### Implementations/Fixes:
*   **`docker-compose.yml` `depends_on` and `healthcheck`:**
    *   Added a `healthcheck` to the `mongodb` service in `docker-compose.yml` to ensure MongoDB is ready to accept connections.
    *   Configured the `mongo-init-replica` service to `depend_on` `mongodb` with a `condition: service_healthy`, ensuring the initialization script runs only when MongoDB is fully up.
    *   The `api` service was then made to `depend_on` `mongo-init-replica`, ensuring the API starts only after the replica set is initiated.
*   **Robust `init-mongo.sh` Script:**
    *   The `init-mongo.sh` script was rewritten to include `until` loops that continuously retry `mongosh` commands.
    *   It now explicitly waits for `rs.initiate()` to succeed.
    *   Crucially, it waits until `rs.status().members.some(member => member.stateStr === "PRIMARY")` evaluates to true, guaranteeing a primary node is elected before proceeding.
    *   Simplified `mongosh --eval` command strings to prevent shell parsing errors.

## 2. Inconsistent API Error Responses (HTML vs. JSON)

### Challenge:
*   **Messy HTML error response for duplicate user registration:** When attempting to register a user with an email or username that already existed, the API returned a generic HTML error page instead of a structured JSON error response. This made API consumption difficult and inconsistent.

### Implementations/Fixes:
*   **Custom Error Class (`CustomError`):**
    *   A `CustomError` class was introduced in `src/middleware/error.middleware.ts`. This class extends `Error` and includes a `statusCode` property, allowing for specific HTTP status codes to be associated with custom application errors.
*   **Direct Error Propagation in Services:**
    *   In `src/services/user.service.ts`, the `registerUser` function was modified to directly `throw new CustomError(...)` when a duplicate user is detected.
    *   An outer `try...catch` block in `registerUser` that was re-throwing generic errors was removed, ensuring the `CustomError` instance propagates correctly.
*   **Correct Global Error Handling Middleware:**
    *   The global error handling middleware in `src/app.ts` was refined to correctly intercept errors.
    *   The middleware's signature was corrected to `(err: Error, req: Request, res: Response, next: NextFunction)`, which is the standard four-argument signature required by Express for error-handling middleware. This ensures it catches errors passed via `next(error)`.
    *   The middleware now checks if the `err` is an instance of `CustomError` and uses its `statusCode` and `message` to construct a consistent JSON error response.

## 3. TypeScript Compilation Issues

### Challenges:
*   **`TS1232: An import declaration can only be used at the top level`:** This error occurred when an `import` statement was accidentally placed inside a function or block, violating TypeScript's module structure rules.
*   **`TS2552: Cannot find name 'NextFunction'`:** This error indicated that the `NextFunction` type, used in Express middleware signatures, was not properly imported or recognized by TypeScript.

### Implementations/Fixes:
*   **Correct Import Placement:** The misplaced `import { CustomError } from "../middleware/error.middleware";` in `src/services/user.service.ts` was moved to the top of the file.
*   **Complete Express Import:** `NextFunction` was explicitly added to the import statement from `express` in `src/app.ts`: `import express, { Application, Request, Response, NextFunction } from "express";`.

## 4. Docker Volume Management for Testing

### Challenge:
*   **Difficulty in clearing MongoDB data:** Users faced issues removing Docker volumes to clear test data, often encountering "volume is in use" errors.

### Implementations/Fixes:
*   **Clear Instructions for Volume Removal:** Provided a step-by-step process:
    1.  Stop and remove all Docker Compose services using `docker-compose down`.
    2.  Identify the correct Docker volume name (e.g., `smart-home-automation-api_mongodb_data`).
    3.  Remove the volume using `docker volume rm <volume_name>`.
    4.  Restart services with `docker-compose up -d` to get a fresh database instance.
