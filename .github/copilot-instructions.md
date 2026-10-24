# Repository instructions for Copilot

Project: smart-home-automation-api (Express 4, TypeScript strict, Mongoose 8, Socket.IO, Aedes MQTT, Jest + supertest).

Rules, always:

- TypeScript strict. NEVER use `any`. Use `unknown` and narrow, or parse with Zod.
- Style: double quotes, semicolons, 2-space indent, named exports (default exports only for models and the Express app).
- Errors: throw `CustomError(message, statusCode, code?)`. Controllers wrap async work in try/catch and call `next(err)`. Never send raw error messages or stacks from unknown errors.
- Authorisation lives in services, through `src/services/access.service.ts` (`getMembership`, `requireRole`). Never trust `req.user.role`; it is a deprecated global field.
- Every request body is validated with a Zod schema before it reaches a service (`validateBody(schema)` from `src/middleware/validate.middleware.ts`).
- Never log secrets: passwords, access tokens, refresh tokens, cookies, API keys, webhook secrets.
- Never build Mongo queries from raw user input; use validated values only.
- Every new route needs a supertest test covering: 401 (no token), 404 (outsider), 403 (member where owner required), 200 (owner), and one invalid-body case.
- Do not use console.\*; use `logger` (pino).
- Keep Node >= 22 compatible code. No new dependency without saying why in the PR description.
- Run `npm run lint`, `npm run build` and `npm test` before finishing.
