import pino from "pino";
import { env } from "../config/env";

const logger = pino({
  level: env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },

  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
          },
        }
      : undefined,
});

export default logger;
