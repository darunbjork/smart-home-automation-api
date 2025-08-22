// smart-home-automation-api/src/config/db.ts
import mongoose from "mongoose";
import { env } from "./env"; // Our environment variables
import logger from "../utils/logger"; // Our custom logger

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || env.MONGO_URI;

    if (!mongoURI) {
      // Senior insight: Fail fast if critical configuration is missing.
      throw new Error("MONGO_URI is not defined in environment variables.");
    }

    // Connect to MongoDB using Mongoose
    await mongoose.connect(mongoURI, {
      connectTimeoutMS: 30000, // Give up after 30 seconds
      serverSelectionTimeoutMS: 30000, // Keep trying to send operations for 30 seconds
      // These options are recommended for new deployments to avoid deprecation warnings
      // and ensure stable connections.
      // Senior insight: Keep up-to-date with driver options and best practices.
      // useNewUrlParser: true, // Deprecated in Mongoose 6, implicitly true
      // useUnifiedTopology: true, // Deprecated in Mongoose 6, implicitly true
    });

    logger.info("MongoDB Connected successfully.");

    // Log Mongoose connection events for better observability
    mongoose.connection.on("connected", () => {
      logger.info("Mongoose default connection open to " + mongoURI);
    });

    mongoose.connection.on("error", (err) => {
      logger.error("Mongoose default connection error: " + err);
      // Senior insight: Don't just log, consider exiting for unrecoverable errors.
      process.exit(1); // Exit process on severe connection error
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("Mongoose default connection disconnected.");
    });

    // If the Node process ends, close the Mongoose connection
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      logger.info(
        "Mongoose default connection disconnected through app termination.",
      );
      process.exit(0);
    });
  } catch (error) {
    logger.error({ error }, "MongoDB Connection Failed.");
    // Senior insight: Ensure application cannot run without a database connection.
    process.exit(1); // Exit the process with failure code
  }
};

export default connectDB;
