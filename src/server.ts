// smart-home-automation-api/src/server.ts
import app from "./app";
import { env } from "./config/env";
// We will replace console.log with a proper logger (Winston) later
import logger from "./utils/logger"; // Our custom logger, will be implemented soon

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  // A senior engineer considers clear start-up messages for operational clarity.
  // Also, graceful shutdown handling is critical (we'll add that next).
  logger.info(`Server running on port ${PORT} in ${env.NODE_ENV} environment.`);
  logger.info(`Access health check at http://localhost:${PORT}/health`);
});

// --- Graceful Shutdown Handling (Pillar 8: Configuration & Deployment) ---
// This ensures that our server shuts down cleanly, allowing ongoing requests to complete
// and preventing data loss or abrupt disconnections, especially in containerized environments.
const gracefulShutdown = () => {
  logger.info("Received shutdown signal. Closing server...");
  server.close(async (err) => {
    if (err) {
      logger.error("Error during server shutdown:", err);
      process.exit(1); // Exit with failure code
    }
    // In later steps, we would close database connections (MongoDB, Redis),
    // stop background job consumers (BullMQ), etc. here.
    logger.info("Server closed. Exiting process.");
    process.exit(0); // Exit with success code
  });

  // Force close server after 10 seconds if it's still running
  // This is a failsafe to prevent indefinite hang-ups.
  setTimeout(() => {
    logger.error("Forcefully shutting down server due to timeout.");
    process.exit(1);
  }, 10000); // 10 seconds timeout
};

// Listen for termination signals (e.g., from Docker, Kubernetes, or 'kill' command)
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown); // Ctrl+C in development
process.on("unhandledRejection", (reason, promise) => {
  // A senior engineer logs and handles unhandled promise rejections
  // to prevent process crashes in production.
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  // It's often debated whether to exit on unhandled rejections.
  // For critical backend services, crashing and restarting is often preferred
  // to prevent the process from entering an unknown state.
  gracefulShutdown();
});

process.on("uncaughtException", (err) => {
  // A senior engineer catches and logs uncaught exceptions to avoid
  // application crashes due to synchronous errors.
  logger.error("Uncaught Exception:", err);
  gracefulShutdown();
});
