// smart-home-automation-api/src/app.ts
import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import healthRoutes from "./routes/health.routes";
import userRoutes from "./routes/user.routes";
import deviceRoutes from "./routes/device.routes"; // NEW: Import device routes
import { env } from "./config/env";
import { errorHandler } from "./middleware/error.middleware";

const app: Application = express();

app.use(helmet());
app.use(
  cors({
    origin:
      env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "YOUR_FRONTEND_DOMAIN",
    credentials: true,
  }),
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(apiLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Routes ---
app.use("/", healthRoutes);
app.use("/users", userRoutes);
app.use("/devices", deviceRoutes); // NEW: Add device routes

// Define Swagger/OpenAPI schemas and responses...
/**
 * @swagger
 * components:
 * securitySchemes:
 * bearerAuth:
 * type: http
 * scheme: bearer
 * bearerFormat: JWT
 * schemas:
 * DeviceResponse: # NEW: Schema for Device object in responses
 * type: object
 * properties:
 * _id:
 * type: string
 * example: "60f8b8e0c8d7c1a0c8d7c1a2"
 * name:
 * type: string
 * example: "Living Room Light"
 * type:
 * type: string
 * example: "light"
 * status:
 * type: string
 * enum: ["online", "offline", "unknown"]
 * example: "online"
 * household:
 * type: string
 * example: "60f8b8e0c8d7c1a0c8d7c1a1"
 * owner:
 * type: string
 * example: "60f8b8e0c8d7c1a0c8d7c1a0"
 * data:
 * type: object
 * example: { "on": true, "brightness": 80 }
 * createdAt:
 * type: string
 * format: date-time
 * example: "2025-07-21T10:00:00Z"
 * updatedAt:
 * type: string
 * format: date-time
 * example: "2025-07-21T10:00:00Z"
 * UserResponse:
 * ...
 * responses:
 * ...
 */

app.use(errorHandler);

export default app;
