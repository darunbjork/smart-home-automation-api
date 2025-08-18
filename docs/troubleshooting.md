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