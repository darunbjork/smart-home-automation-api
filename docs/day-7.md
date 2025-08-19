# Week 1, Day 7 — Professionalism & Automation: Documentation, Logging, and CI

## Summary

Day 7 focused on elevating the Smart Home Automation API from a functional prototype to a professional-grade project by implementing crucial aspects of documentation, logging, and automation. This involved setting up automated API documentation with Swagger UI, refining the logging system for production readiness, creating a comprehensive `README.md`, and establishing a basic CI pipeline using GitHub Actions.

## Learning Objectives Achieved

-   **API Design Excellence and Professionalism:** Ensured the API is well-documented and maintainable.
-   **Automated API Documentation:** Implemented Swagger UI for interactive and up-to-date API documentation.
-   **Structured Logging:** Transitioned to a structured JSON logging system for better observability and analysis.
-   **Automated Testing and Builds:** Set up a basic CI pipeline to automate the build and test process on every code change.

## Design Decisions & Tradeoffs

1.  **Automated Swagger Documentation (`swagger-jsdoc`, `swagger-ui-express`):**
    *   **Why:** To ensure API documentation remains in sync with the code, reducing manual effort and errors. Provides an interactive interface for developers.
    *   **Tradeoff:** Requires adding JSDoc comments to route files, which can be verbose.

2.  **Structured JSON Logging (`pino`, `pino-pretty`):**
    *   **Why:** Simple string logs are hard to parse at scale. Structured JSON logs are easily ingestible by centralized logging systems, improving debugging, monitoring, and auditing in production. `pino-pretty` provides human-readable output for development.
    *   **Tradeoff:** Adds a dependency and requires slight changes to logging calls.

3.  **GitHub Actions for CI:**
    *   **Why:** Automates build and test processes, catching errors early and maintaining code quality. Deeply integrated with GitHub, making it convenient for projects hosted there.
    *   **Tradeoff:** Requires configuration in YAML and understanding of GitHub Actions syntax.

## Implementation Details

### 1. Swagger/OpenAPI Documentation Setup

*   **Packages Installed:** `swagger-ui-express`, `swagger-jsdoc`.
*   **Configuration File:** Created `src/config/swagger.ts` to define the OpenAPI specification, including API info, server URLs, security schemes (`bearerAuth`), common responses (`BadRequest`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`, `InternalServerError`), and reusable schemas (`UserResponse`, `DeviceResponse`, `HouseholdResponse`, `Invitation`).
*   **Integration:** Added `swaggerUi.serve` and `swaggerUi.setup(swaggerSpec)` middleware to `src/app.ts` under the `/api-docs` route.
*   **JSDoc Corrections:** Addressed `YAMLSemanticError` and `TypeError` issues by correcting malformed JSDoc comments in `src/routes/device.routes.ts` and `src/routes/household.routes.ts`, ensuring proper YAML structure and unique keys within Swagger definitions.

### 2. Structured Logging Implementation

*   **Packages Installed:** `pino`, `pino-pretty`.
*   **Logger Configuration:** Modified `src/utils/logger.ts` to initialize `pino`. Configured log level via `env.LOG_LEVEL` and used `pino-pretty` for development environments to format logs.
*   **Environment Variable:** Added `LOG_LEVEL=debug` to the `.env` file.

### 3. Professional `README.md` Creation

*   **Content:** Updated the project's `README.md` with a comprehensive overview, key features, prerequisites, installation instructions, running instructions, testing guide, API documentation access, and contribution guidelines.
*   **Project Evolution Section:** Included a detailed "Project Evolution: A Day-by-Day Journey" section summarizing the objectives, key activities, and outcomes from Day 1 to Day 6.
*   **Security:** Ensured no sensitive information (e.g., actual secret keys) was included in the `README.md`, using comments to indicate where users should provide their own secrets.

### 4. Basic CI Pipeline with GitHub Actions

*   **Directory Structure:** Created `.github/workflows` directory.
*   **Workflow File:** Created `ci.yml` inside `.github/workflows`.
*   **Workflow Configuration:** Defined a CI workflow to run on `push` to `main` and `develop` branches, and on `pull_request`.
    *   **Steps:** Checkout repository, set up Node.js (v18), install dependencies (`npm ci`), build TypeScript (`npm run build`), and run tests (`npm test`).
    *   **Secrets Handling:** Configured `JWT_SECRET` and `JWT_REFRESH_SECRET` to be passed as environment variables to the test job using GitHub Secrets (`${{ secrets.JWT_SECRET }}`).
    *   **Database for Tests:** Specified `MONGO_URI: mongodb://localhost:27017/test-db` for isolated testing.

## Issues Faced & Resolutions

*   **`sh: tsc: not found` in Docker build:** Resolved by implementing a multi-stage Dockerfile (`builder`, `production`, `development` stages) to ensure `typescript` is installed during the build phase.
*   **`CRITICAL: Environment variable JWT_REFRESH_SECRET is not set.`:** Resolved by ensuring consistent naming of environment variables (`JWT_REFRESH_SECRET`, `ACCESS_TOKEN_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`) across `.env`, `docker-compose.yml`, and `src/config/env.ts`. Explicitly passed variables in `docker-compose.yml` and forced Docker Compose rebuilds to clear caching issues.
*   **`YAMLSemanticError: Map keys must be unique` in Swagger JSDoc:** Resolved by restructuring JSDoc comments in route files (`device.routes.ts`, `household.routes.ts`) to correctly separate HTTP methods and ensure unique keys within Swagger definitions. Corrected a typo (`security:c` to `security:`).

## Conclusion

Day 7 successfully transformed the API into a more robust, maintainable, and developer-friendly project. The integration of automated documentation, structured logging, and a CI pipeline significantly enhances the project's professionalism and sets a strong foundation for future development and team collaboration.
