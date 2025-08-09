import express, { Application, Request, Response, NextFunction } from "express";
import helmet from "helmet"; // Security headers
import cors from "cors"; // Cross-Origin Resource Sharing
import rateLimit from "express-rate-limit"; // Rate limiting
import healthRoutes from "./routes/health.routes";
import userRoutes from "./routes/user.routes"; // Import user routes
import { env } from "./config/env";
import logger from "./utils/logger";
import { CustomError } from "./middleware/error.middleware"; // Import CustomError

const app: Application = express();

// --- Security Middleware (Pillar 2: Security Infrastructure) ---
// Helmet helps secure Express apps by setting various HTTP headers.
// It's a collection of 14 smaller middleware functions that set security-related HTTP headers.
app.use(helmet());

// CORS (Cross-Origin Resource Sharing)
// Allows specific origins to access our API. In production, this should be restricted
// to known frontend domains. For now, we allow all for development ease.
// Senior insight: In production, explicitly list allowed origins like:
// cors({ origin: ["https://your-frontend.com", "https://your-mobile-app.com"] })
app.use(cors());

// Rate Limiting (Pillar 2: Security Infrastructure)
// Basic rate limiting to protect against brute-force attacks and abuse.
// Allows 100 requests per 15 minutes per IP address.
// This is a foundational security measure.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(apiLimiter);

// --- Core Express Middleware ---
// Body parser to parse JSON requests.
// This is essential for handling incoming data from client applications.
app.use(express.json());

// URL-encoded body parser for traditional form submissions.
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
// Health check route - crucial for load balancers and container orchestration.
app.use("/", healthRoutes);
app.use("/auth", userRoutes); // Use user routes under the /auth prefix

// --- Global Error Handling Middleware (Pillar 3: Error Handling & Observability) ---
// This is our catch-all for unhandled errors.
// A senior engineer ensures that errors are gracefully handled and not leaked to clients.
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error("Unhandled API Error:", err);

  // Determine status code: use custom error's statusCode or default to 500
  const statusCode = err instanceof CustomError ? err.statusCode : 500;
  // Determine message: hide internal message in production
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

// Export the app for server.ts to use and for testing.
export default app;
