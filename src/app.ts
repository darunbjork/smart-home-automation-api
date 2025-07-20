import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import healthRoutes from './routes/health.routes';
import userRoutes from './routes/user.routes'; // Import user routes
import { env } from './config/env';
import logger from './utils/logger';
import { CustomError } from './middleware/error.middleware'; // Import CustomError

const app: Application = express();

app.use(helmet());
app.use(cors());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(apiLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
app.use('/', healthRoutes);
app.use('/auth', userRoutes); // Use user routes under the /auth prefix

// --- Global Error Handling Middleware (Pillar 3: Error Handling & Observability) ---
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled API Error:', err);

  // Determine status code: use custom error's statusCode or default to 500
  const statusCode = err instanceof CustomError ? err.statusCode : 500;
  // Determine message: hide internal message in production
  const message = env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message;

  res.status(statusCode).json({
    error: {
      message: message,
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

export default app;