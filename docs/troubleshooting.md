# Troubleshooting Guide

This document outlines common issues encountered during development and deployment, along with their solutions.

## Issue 1: `sh: tsc: not found` during Docker build

**Problem:**
When building the Docker image, the `npm run build` command fails with `sh: tsc: not found`. This occurs because `tsc` (TypeScript compiler) is a development dependency, but the Dockerfile's `base` stage was configured to install only production dependencies.

**Solution:**
The `Dockerfile` was refactored to use a multi-stage build pattern:
1.  **`builder` stage:** This stage installs *all* `npm` dependencies (including `devDependencies` like `typescript`) and performs the `npm run build` step.
2.  **`production` stage:** This stage starts fresh, installs *only* production dependencies, and then copies the compiled JavaScript artifacts from the `builder` stage. This keeps the final production image lean.
3.  **`development` stage:** This stage is specifically for local development, installing all dependencies and copying all source files for hot-reloading.

**Relevant Dockerfile changes:**

```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production (base image for final application)
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["npm", "start"]

# Stage 3: Development (for local development with nodemon)
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
```

## Issue 2: `CRITICAL: Environment variable JWT_REFRESH_SECRET is not set.`

**Problem:**
After resolving the `tsc` issue, the application failed to start with an error indicating that the `JWT_REFRESH_SECRET` environment variable was not set. This was due to a mismatch between the environment variable name expected by the application's configuration (`src/config/env.ts`) and the name defined in the `.env` file.

**Solution:**
The `.env` file was updated to align the environment variable names with those expected by the application.

**Relevant `.env` changes:**

```ini
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://mongodb:27017/smart-home-db
JWT_SECRET= # Ensure this is set
JWT_REFRESH_SECRET= # Ensure this is set
ACCESS_TOKEN_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d
LOG_LEVEL=debug
```

## Issue 3: Swagger JSDoc `YAMLSemanticError` and `TypeError`

**Problem:**
After setting up Swagger UI, the application logs showed `YAMLSemanticError: Map keys must be unique` and `TypeError: Cannot read properties of null (reading 'name')` errors, primarily pointing to `src/routes/device.routes.ts` and `src/routes/household.routes.ts`. This was caused by incorrectly structured JSDoc comments for Swagger, where HTTP operations were nested improperly or keys were duplicated within a single definition.

**Solution:**
The JSDoc comments in the affected route files were refactored to adhere to the OpenAPI specification's structure. Each HTTP method (GET, POST, PATCH, DELETE) for a given path was placed in its own distinct JSDoc block, and duplicate keys within operation definitions were removed. A typo (`security:c` instead of `security:`) was also corrected.

**Relevant changes (example from `device.routes.ts`):**

```typescript
// Before (problematic nesting/duplicates)
/**
 * @swagger
 * /devices/{id}:
 * get:
 *   summary: Get a single device by ID
 *   ...
 * patch: // <-- Incorrectly nested
 *   summary: Update a device
 *   ...
 * delete: // <-- Incorrectly nested
 *   summary: Delete a device
 *   ...
 */

// After (correctly separated)
/**
 * @swagger
 * /devices/{id}:
 *   get:
 *     summary: Get a single device by ID
 *     ...
 */

/**
 * @swagger
 * /devices/{id}:
 *   patch:
 *     summary: Update a device
 *     ...
 */

/**
 * @swagger
 * /devices/{id}:
 *   delete:
 *     summary: Delete a device
 *     ...
 */
```

## Issue 4: TypeScript Compilation Errors (`Argument of type 'unknown'/'Error' is not assignable to parameter of type 'undefined'`)

**Problem:**
During TypeScript compilation (`npm run build`), numerous errors appeared, such as `Argument of type 'unknown' is not assignable to parameter of type 'undefined'.` and `Argument of type 'Error' is not assignable to parameter of type 'undefined'.`. These errors occurred in various files where `logger.error` or `logger.warn` were used within `catch` blocks, particularly when `error` was of type `unknown`. The TypeScript compiler was misinterpreting the `pino` logger's method signatures.

**Solution:**
The calls to `logger.error` and `logger.warn` were updated to explicitly pass the error object as a property within a log object, which is a robust and type-safe way to log errors with Pino. This clarifies the intent for the TypeScript compiler. Additionally, specific type annotations were corrected for `unhandledRejection` event handlers.

**Relevant changes (example from `src/app.ts` and general pattern):**

```typescript
// Before
logger.error("Unhandled API Error:", err);

// After
logger.error({ err }, "Unhandled API Error.");

// Before (in server.ts unhandledRejection)
process.on("unhandledRejection", (reason: PromiseRejectionEvent, promise: Promise<any>) => { ... });

// After (in server.ts unhandledRejection)
process.on("unhandledRejection", (reason: unknown, promise: Promise<any>) => { ... });
```