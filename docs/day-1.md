# Day 1: Project Initialization & Enterprise Setup

## Learning Objectives

- Set up a production-grade Node.js project with TypeScript.
- Implement a modular folder structure for scalability and maintainability.
- Integrate essential security middleware (`helmet`, `cors`, `express-rate-limit`).
- Create a health check endpoint for monitoring.
- Dockerize the application for consistent development and deployment environments.

## Key Activities

- Initialized a Node.js project and installed core dependencies (`express`, `typescript`, `dotenv`).
- Configured TypeScript with a strict `tsconfig.json`.
- Created a modular folder structure (`src`, `config`, `controllers`, etc.).
- Implemented environment variable handling with `.env` and `src/config/env.ts`.
- Developed a health check route (`/health`) with a test.
- Set up the Express application in `src/app.ts` with security middleware and global error handling.
- Implemented a server entry point in `src/server.ts` with graceful shutdown handling.
- Added a basic logger utility.
- Configured Jest and `ts-jest` for testing and wrote an initial integration test.
- Created a `.gitignore` file.
- Wrote a `Dockerfile` for building a production-ready image and a `docker-compose.yml` for development.

## Architectural Decisions

- **TypeScript:** Chosen for type safety and improved code quality.
- **Modular Architecture:** To promote separation of concerns.
- **Express.js:** For its flexibility and large ecosystem.
- **Docker:** To ensure environment consistency and simplify deployment.

## Security Measures Implemented

- `helmet` for security-related HTTP headers.
- `express-rate-limit` for protection against brute-force attacks.
- Secure environment variable management.
- Prevention of stack trace leakage in production.

## Outcome

A fully functional, containerized Node.js application with a solid foundation for future development. The project is secure, testable, and ready for scaling.
