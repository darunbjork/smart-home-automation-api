import * as Sentry from "@sentry/node";
import { env } from "./env";
import logger from "../utils/logger";

// Sentry is optional and entirely env-gated: with no SENTRY_DSN set (tests,
// local dev) nothing is initialised and every helper below is a no-op.

let initialised = false;

export const initSentry = (): void => {
  if (initialised) return;
  if (env.SENTRY_DSN === "") return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0.1,
    maxValueLength: 500,
  });
  initialised = true;
  logger.info("Sentry error reporting enabled.");
};

export const isSentryEnabled = (): boolean => initialised;

export const captureException = (
  error: unknown,
  context?: Record<string, string>,
): void => {
  if (!initialised) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
};
