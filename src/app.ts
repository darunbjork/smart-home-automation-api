// smart-home-automation-api/src/app.ts
import express, { Application, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import healthRoutes from "./routes/health.routes";
import userRoutes from "./routes/user.routes";
import deviceRoutes from "./routes/device.routes";
import householdRoutes from "./routes/household.routes";
import swaggerUi from "swagger-ui-express"; // NEW
import swaggerSpec from "./config/swagger"; // NEW
import { env } from "./config/env";
import logger from "./utils/logger";
import { CustomError } from "./middleware/error.middleware";

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

// --- Documentation Route (NEW) ---
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- Routes ---
app.use("/", healthRoutes);
app.use("/users", userRoutes);
app.use("/devices", deviceRoutes);
app.use("/households", householdRoutes); // NEW: Add household routes

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
 * Invitation: # NEW: Schema for Invitation object
 * type: object
 * properties:
 * _id:
 * type: string
 * example: "60f8b8e0c8d7c1a0c8d7c1a3"
 * household:
 * type: string
 * example: "60f8b8e0c8d7c1a0c8d7c1a1"
 * inviter:
 * type: string
 * example: "60f8b8e0c8d7c1a0c8d7c1a0"
 * inviteeEmail:
 * type: string
 * example: "member @example.com"
 * token:
 * type: string
 * example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
 * expiresAt:
 * type: string
 * format: date-time
 * example: "2025-07-22T10:00:00Z"
 * HouseholdResponse: # NEW: Schema for Household object
 * type: object
 * properties:
 * _id:
 * type: string
 * example: "60f8b8e0c8d7c1a0c8d7c1a1"
 * name:
 * type: string
 * example: "Doe Family Home"
 * owner:
 * type: string
 * example: "60f8b8e0c8d7c1a0c8d7c1a0"
 * members:
 * type: array
 * items:
 * type: string
 * example: "60f8b8e0c8d7c1a0c8d7c1a0"
 * devices:
 * type: array
 * items:
 * type: string
 * example: "60f8b8e0c8d7c1a0c8d7c1a2"
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
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Error handler middleware caught an error.");
  logger.error({ err }, "Unhandled API Error.");

  const statusCode = err instanceof CustomError ? err.statusCode : 500;
  const message =
    env.NODE_ENV === "production"
      ? "An unexpected error occurred."
      : err.message;

  res.status(statusCode).json({
    error: {
      message: message,
      ...(env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
});

export default app;
