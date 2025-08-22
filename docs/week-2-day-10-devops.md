# Week 2, Day 10: DevOps, Docker, and CI/CD

This document outlines the steps taken to containerize the application for production using a multi-stage Dockerfile, update the `docker-compose.yml` for a production environment, and set up a CI/CD pipeline with GitHub Actions.

## 1. Multi-Stage Dockerfile

To create a lean and secure production image, I implemented a multi-stage Docker build.

### Changes:

-   **Stage 1 (Builder):** This stage uses a `node:18-slim` image to install all dependencies (including `devDependencies`) and build the TypeScript application by running `npm run build`.
-   **Stage 2 (Production):** This stage starts from a lightweight `node:18-alpine` image. It copies only the necessary production dependencies from the `builder` stage and the compiled application from the `/app/dist` directory. This results in a smaller and more secure final image, as it doesn't contain the source code or development dependencies.

## 2. `package.json` and `docker-compose.yml` Updates

To support the new production-ready Docker image, I updated the `package.json` and `docker-compose.yml` files.

### Changes:

-   **`package.json`:** Added a `start:prod` script (`node dist/server.js`) to run the compiled JavaScript application.
-   **`docker-compose.yml`:**
    -   **Container Names:** Added explicit container names (`smart-home-api` and `smart-home-db`) for easier management.
    -   **Image Tag:** Assigned a specific version tag to our API image (`smart-home-api:v1.0.0`).
    -   **No Volumes for API:** Removed the volume mount for the `api` service in production to ensure the container is a self-contained, immutable artifact.
    -   **`env_file`:** Used an `.env` file to store environment variables, keeping sensitive information out of the `docker-compose.yml` file.
    -   **MongoDB Service:** Defined a `mongo` service with a named volume (`mongo-data`) to persist database data.

## 3. CI/CD Pipeline with GitHub Actions

I created a CI/CD pipeline using GitHub Actions to automate the build, test, and deployment process.

### Changes:

-   Updated the `.github/workflows/ci.yml` file.
-   The workflow is triggered on every push and pull request to the `main` branch.
-   The pipeline performs the following steps:
    1.  Checks out the code.
    2.  Sets up the Node.js environment.
    3.  Installs dependencies using `npm ci`.
    4.  Builds the application.
    5.  Runs tests.
    6.  Builds and pushes a Docker image to Docker Hub.

### Issues Faced and Resolutions:

-   **Outdated GitHub Actions Versions:** The initial workflow file contained outdated versions of the GitHub Actions, which would have caused errors. I updated the versions of `actions/checkout`, `actions/setup-node`, `actions/cache`, `docker/login-action`, and `docker/build-push-action` to their latest stable releases.
-   **Secrets Configuration:** There was some confusion about how to handle secrets. I clarified that secrets like `DOCKER_USERNAME` and `DOCKER_PASSWORD` should be set in the GitHub repository settings and not in the `.env` file.
-   **`MONGO_URI_CI`:** We initially thought we needed a separate MongoDB connection string for the CI environment. However, we realized that the project is already configured to use `mongodb-memory-server` for tests. This simplifies the CI setup, as we don't need to manage a separate database for tests. I removed the `MONGO_URI_CI` environment variable from the `ci.yml` file.
