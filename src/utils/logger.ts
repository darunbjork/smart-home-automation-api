// smart-home-automation-api/src/utils/logger.ts
import pino from "pino";
import { env } from "../config/env";

const logger = pino({
  level: env.LOG_LEVEL || "info", // Set the log level from env, default to 'info'
  formatters: {
    level: (label) => ({ level: label }), // Format level for consistency
  },
  // Use pino-pretty in development for readable logs
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
          },
        }
      : undefined, // In production, don't use a transport so it logs raw JSON
});

export default logger;
