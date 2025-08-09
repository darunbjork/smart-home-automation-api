// smart-home-automation-api/src/server.ts
import app from "./app";
import { env } from "./config/env";
import connectDB from "./config/db"; // Import our database connection function
import logger from "./utils/logger";
import mongoose from "mongoose";

const PORT = env.PORT;

const startServer = async () => {
  // Connect to the database before starting the server.
  // Senior insight: Ensure all critical dependencies (like DB) are ready before serving requests.
  await connectDB();

  const server = app.listen(PORT, () => {
    logger.info(
      `Server running on port ${PORT} in ${env.NODE_ENV} environment.`,
    );
    logger.info(`Access health check at http://localhost:${PORT}/health`);
  });

  // --- Graceful Shutdown Handling (Pillar 8: Configuration & Deployment) ---
  const gracefulShutdown = async () => {
    // Made async to await DB close
    logger.info("Received shutdown signal. Closing server...");
    server.close(async (err) => {
      if (err) {
        logger.error("Error during server shutdown:", err);
        process.exit(1);
      }
      // Senior insight: Explicitly close database connections during shutdown.
      try {
        await mongoose.connection.close(); // Close Mongoose connection
        logger.info("MongoDB connection closed.");
      } catch (dbCloseError) {
        logger.error("Error closing MongoDB connection:", dbCloseError);
      }
      logger.info("Server closed. Exiting process.");
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("Forcefully shutting down server due to timeout.");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at:", promise, "reason:", reason);
    gracefulShutdown();
  });
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception:", err);
    gracefulShutdown();
  });
};

startServer(); // Call the async function to start the server
