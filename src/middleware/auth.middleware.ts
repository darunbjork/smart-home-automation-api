import { Request, Response, NextFunction } from "express";
import { CustomError } from "./error.middleware";
import { verifyAccessToken, JwtPayload } from "../services/auth.service";
import logger from "../utils/logger";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Authentication Middleware
export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new CustomError("No access token provided or malformed.", 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    logger.debug(`User ${decoded.userId} authenticated.`);
    next();
  } catch (error) {
    logger.warn({ error }, "Authentication failed.");
    next(error);
  }
};

// NOTE: the old `authorize(roles)` middleware was removed.
// Authorisation is per household and lives in services
// (`getMembership` / `requireRole` in src/services/access.service.ts).
// The global User.role field and the role claim in the access token are deprecated.
