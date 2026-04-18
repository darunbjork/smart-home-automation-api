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
  res: Response,
  next: NextFunction,
) => {
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

// Authorization Middleware (Role-Based Access Control)
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
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
