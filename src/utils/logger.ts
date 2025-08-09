// smart-home-automation-api/src/utils/logger.ts
// This is a placeholder logger. We'll replace it with Winston for structured logging
// and correlation IDs in Day 4.
const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(`[INFO] ${new Date().toISOString()} ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${new Date().toISOString()} ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`, ...args);
  },
  debug: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === "development") {
      // Only log debug in dev
      console.debug(`[DEBUG] ${new Date().toISOString()} ${message}`, ...args);
    }
  },
};

export default logger;
