// smart-home-automation-api/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import { CustomError } from "./error.middleware";
import { verifyAccessToken, JwtPayload } from "../services/auth.service"; // Import token verification
import logger from "../utils/logger";

// Extend the Request object to include a 'user' property
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload; // Add user property to Request object
    }
  }
}

// Authentication Middleware
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Senior Insight: Tokens are typically sent in the Authorization header as a Bearer token.
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new CustomError("No access token provided or malformed.", 401);
  }

  const token = authHeader.split(" ")[1]; // Extract the token string

  try {
    const decoded = verifyAccessToken(token); // Verify the token
    req.user = decoded; // Attach decoded user info to the request object
    logger.debug(`User ${decoded.userId} authenticated.`);
    next(); // Proceed to the next middleware/route handler
  } catch (error) {
    logger.warn("Authentication failed:", (error as Error).message);
    next(error); // Pass error to global error handler
  }
};

// Authorization Middleware (Role-Based Access Control)
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Senior Insight: Authorization depends on successful authentication first.
    if (!req.user) {
      // This should ideally not happen if 'authenticate' middleware runs before 'authorize'
      throw new CustomError(
        "Unauthorized: User information not available.",
        401,
      );
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(
        `User ${req.user.userId} with role ${req.user.role} attempted unauthorized access.`,
      );
      throw new CustomError(
        "Forbidden: You do not have permission to perform this action.",
        403,
      ); // 403 Forbidden
    }
    logger.debug(
      `User ${req.user.userId} authorized with role ${req.user.role}.`,
    );
    next(); // User has required role, proceed.
  };
};
