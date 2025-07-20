# Developer Journal

This journal is a log of the development process for the Smart Home Automation API. It's a place to record decisions, document issues, and keep track of progress.

## Day 1: Project Setup

- **Goal:** Set up the initial project structure, install dependencies, and get a basic server running.
- **Steps:**
  1. Initialized a new Node.js project.
  2. Installed Express, TypeScript, and other dependencies.
  3. Set up a basic Express server.
  4. Configured TypeScript and set up a `tsconfig.json` file.
  5. Created a `Dockerfile` and `docker-compose.yml` for containerization.
- **Issues:**
  - Encountered a CORS error when trying to access the API from a different origin.
  - **Fix:** Installed the `cors` package and added `app.use(cors())` to the Express middleware.
  - The logger was imported but not used, so it appeared "dark" in the IDE.
  - **Fix:** Replaced `console.error` with `logger.error` in the error handler and added a middleware to log incoming requests.
- **Decisions:**
  - Chose to use `pino` for logging because it's lightweight and fast.
  - Decided to use Docker for containerization to ensure a consistent development and production environment.
