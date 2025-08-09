// smart-home-automation-api/src/middleware/error.middleware.ts
// Define a custom error class for controlled API error responses
export class CustomError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    // Ensure the prototype chain is correctly set for instanceof checks
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

// Our global error handler (already defined in app.ts but useful to have it here too for context)
// This will catch any errors passed to next() or thrown in async routes
/*
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import logger from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled API Error:', err);

  const statusCode = err instanceof CustomError ? err.statusCode : 500;
  const message = env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message;

  res.status(statusCode).json({
    error: {
      message: message,
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};
*/
