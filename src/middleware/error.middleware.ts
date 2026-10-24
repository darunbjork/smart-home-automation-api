import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { captureException } from "../config/sentry";
import logger from "../utils/logger";

const defaultCodeFor = (status: number): string => {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 413:
      return "PAYLOAD_TOO_LARGE";
    case 422:
      return "VALIDATION";
    case 429:
      return "RATE_LIMITED";
    case 503:
      return "UNAVAILABLE";
    default:
      return "INTERNAL";
  }
};

export class CustomError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational = true;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.name = "CustomError";
    this.statusCode = statusCode;
    this.code = code ?? defaultCodeFor(statusCode);
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
}

const errorStatus = (err: unknown): number | undefined => {
  if (typeof err !== "object" || err === null) return undefined;
  const candidate = err as { status?: unknown; statusCode?: unknown };
  const status =
    typeof candidate.status === "number"
      ? candidate.status
      : typeof candidate.statusCode === "number"
        ? candidate.statusCode
        : undefined;
  return status !== undefined && status >= 400 && status < 500
    ? status
    : undefined;
};

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof CustomError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path }, "Operational server error.");
      captureException(err, {
        path: req.path,
        method: req.method,
        status: String(err.statusCode),
        userId: req.user?.userId ?? "anonymous",
      });
    }
    res
      .status(err.statusCode)
      .json({ error: { code: err.code, message: err.message } });
    return;
  }

  // Body-parser and other framework 4xx errors (malformed JSON, payload too large).
  const clientStatus = errorStatus(err);
  if (clientStatus !== undefined) {
    logger.warn({ err, path: req.path }, "Rejected client request.");
    const message =
      clientStatus === 413
        ? "Payload too large."
        : clientStatus === 400
          ? "Invalid JSON payload."
          : "Bad request.";
    res
      .status(clientStatus)
      .json({ error: { code: defaultCodeFor(clientStatus), message } });
    return;
  }

  // Unknown error = a bug. Log everything server-side, tell the client nothing.
  logger.error({ err, path: req.path, method: req.method }, "Unhandled error.");
  captureException(err, {
    path: req.path,
    method: req.method,
    userId: req.user?.userId ?? "anonymous",
  });
  res.status(500).json({
    error: {
      code: "INTERNAL",
      message:
        env.NODE_ENV === "production"
          ? "An unexpected error occurred."
          : err instanceof Error
            ? err.message
            : "Unknown error.",
    },
  });
};

export const notFoundHandler = (
  _req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  next(new CustomError("Route not found.", 404, "NOT_FOUND"));
};

// Kept for callers that only need the error class import.
export type { ErrorWithStatus };
