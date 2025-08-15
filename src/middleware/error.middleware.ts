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

interface ErrorWithStatus extends Error {
  status?: number;
}

function isErrorWithStatus(error: unknown): error is ErrorWithStatus {
  return typeof error === "object" && error !== null && "status" in error;
}

// Our global error handler (already defined in app.ts but useful to have it here too for context)
// This will catch any errors passed to next() or thrown in async routes
import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import logger from "../utils/logger";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  logger.error("Unhandled API Error:", err);

  let statusCode = 500;
  let message = "An unexpected error occurred.";

  if (err instanceof CustomError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (
    err instanceof SyntaxError &&
    isErrorWithStatus(err) &&
    err.status === 400 &&
    err.message.includes("JSON")
  ) {
    // Handle JSON parsing errors specifically
    statusCode = 400;
    message = "Invalid JSON payload.";
  } else {
    message =
      env.NODE_ENV === "production"
        ? "An unexpected error occurred."
        : err.message;
  }

  res.status(statusCode).json({
    error: {
      message: message,
      ...(env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
};
