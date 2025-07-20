// smart-home-automation-api/src/app.ts
import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet'; // Security headers
import cors from 'cors'; // Cross-Origin Resource Sharing
import rateLimit from 'express-rate-limit'; // Rate limiting
import healthRoutes from './routes/health.routes';
import { env } from './config/env'; // Our environment configuration
import logger from './utils/logger'; // We'll create this later for structured logging

const app: Application = express();

// --- Security Middleware (Pillar 2: Security Infrastructure) ---
// Helmet helps secure Express apps by setting various HTTP headers.
// It's a collection of 14 smaller middleware functions that set security-related HTTP headers.
app.use(helmet());

// CORS (Cross-Origin Resource Sharing)
// Allows specific origins to access our API. In production, this should be restricted
// to known frontend domains. For now, we allow all for development ease.
// Senior insight: In production, explicitly list allowed origins like:
// cors({ origin: ['https://your-frontend.com', 'https://your-mobile-app.com'] })
app.use(cors());

// Rate Limiting (Pillar 2: Security Infrastructure)
// Basic rate limiting to protect against brute-force attacks and abuse.
// Allows 100 requests per 15 minutes per IP address.
// This is a foundational security measure.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
// Apply the rate limiting middleware to all requests
// A senior engineer knows that applying rate limiting globally is a good first step,
// but it can be refined later to apply only to specific routes or methods.
app.use(apiLimiter);

// --- Core Express Middleware ---
// Body parser to parse JSON requests.
// This is essential for handling incoming data from client applications.
app.use(express.json());

// URL-encoded body parser for traditional form submissions.
app.use(express.urlencoded({ extended: true }));

// --- Request Logging Middleware (Pillar 3: Error Handling & Observability) ---
// Log every incoming request for debugging and monitoring purposes.
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`Incoming request: ${req.method} ${req.originalUrl}`);
  next();
});

// --- Routes ---
// Health check route - crucial for load balancers and container orchestration.
app.use('/', healthRoutes); // Use '/' as prefix for health, so it's accessible at /health

// --- Global Error Handling Middleware (Pillar 3: Error Handling & Observability) ---
// This is our catch-all for unhandled errors.
// A senior engineer ensures that errors are gracefully handled and not leaked to clients.
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Use our structured logger to log the error.
  // In a real application, this would integrate with services like Sentry.
  logger.error('Unhandled API Error:', {
    message: err.message,
    stack: err.stack,
  });

  const statusCode = (err as any).statusCode || 500; // Custom errors might have a statusCode
  const message = env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message;

  // Never send stack traces in production! This is a major security risk.
  res.status(statusCode).json({
    error: {
      message: message,
      ...(env.NODE_ENV === 'development' && { stack: err.stack }), // Only expose stack in dev
    },
  });
});

// Export the app for server.ts to use and for testing.
export default app;