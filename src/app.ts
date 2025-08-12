// smart-home-automation-api/src/app.ts
import express, { Application, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import healthRoutes from "./routes/health.routes";
import userRoutes from "./routes/user.routes"; // Re-import user routes
import { env } from "./config/env";
import logger from "./utils/logger";
import { CustomError } from "./middleware/error.middleware";

const app: Application = express();

app.use(helmet());
app.use(cors());

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

// --- Routes ---
app.use("/", healthRoutes);
// Senior insight: Changed prefix from '/auth' to '/users' for general user management
// Authentication routes remain under `/users` with /register, /login.
app.use("/users", userRoutes);

// Define Swagger/OpenAPI schemas for common responses/models for documentation.
// This is a setup for our Swagger documentation, will be expanded later.
/**
 * @swagger
 * components:
 * schemas:
 * UserResponse:
 * type: object
 * properties:
 * _id:
 * type: string
 * description: The user ID.
 * example: 60f8b8e0c8d7c1a0c8d7c1a0
 * username:
 * type: string
 * description: The user's chosen username.
 * example: john_doe
 * email:
 * type: string
 * format: email
 * description: The user's email address.
 * example: john.doe @example.com
 * households:
 * type: array
 * items:
 * type: object
 * properties:
 * _id:
 * type: string
 * example: 60f8b8e0c8d7c1a0c8d7c1a1
 * name:
 * type: string
 * example: "Doe Family Home"
 * role:
 * type: string
 * description: The user's role (owner or member).
 * example: owner
 * createdAt:
 * type: string
 * format: date-time
 * description: The date the user was created.
 * example: 2025-07-21T10:00:00Z
 * updatedAt:
 * type: string
 * format: date-time
 * description: The date the user was last updated.
 * example: 2025-07-21T10:00:00Z
 * responses:
 * BadRequest:
 * description: Invalid input data.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * error:
 * type: object
 * properties:
 * message:
 * type: string
 * example: "Validation failed: Username must be between 3 and 30 characters"
 * Unauthorized:
 * description: Authentication failed.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * error:
 * type: object
 * properties:
 * message:
 * type: string
 * example: "Invalid credentials."
 * NotFound:
 * description: Resource not found.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * error:
 * type: object
 * properties:
 * message:
 * type: string
 * example: "User not found."
 * Conflict:
 * description: Resource conflict (e.g., duplicate unique key).
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * error:
 * type: object
 * properties:
 * message:
 * type: string
 * example: "Username or email already exists."
 * InternalServerError:
 * description: Unexpected internal server error.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * error:
 * type: object
 * properties:
 * message:
 * type: string
 * example: "An unexpected error occurred."
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled API Error:", err);

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
