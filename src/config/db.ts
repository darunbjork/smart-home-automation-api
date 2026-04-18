import mongoose from "mongoose";
import { env } from "./env"; 
import logger from "../utils/logger"; 

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || env.MONGO_URI;

    if (!mongoURI) {
      throw new Error("MONGO_URI is not defined in environment variables.");
    }

    await mongoose.connect(mongoURI, {
      connectTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000, 
    });

    logger.info("MongoDB Connected successfully.");

    mongoose.connection.on("connected", () => {
      logger.info("Mongoose default connection open to " + mongoURI);
    });

    mongoose.connection.on("error", (err) => {
      logger.error("Mongoose default connection error: " + err);
      process.exit(1); 
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("Mongoose default connection disconnected.");
    });

    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      logger.info(
        "Mongoose default connection disconnected through app termination.",
      );
      process.exit(0);
    });
  } catch (error) {
    logger.error({ error }, "MongoDB Connection Failed.");
    process.exit(1);
  }
};

export default connectDB;
