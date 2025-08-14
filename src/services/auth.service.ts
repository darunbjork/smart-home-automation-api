// smart-home-automation-api/src/services/auth.service.ts
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { IUser } from "../types/user.d";
import RefreshToken from "../models/RefreshToken";
import { CustomError } from "../middleware/error.middleware";
import logger from "../utils/logger";
import User from "../models/User"; // Added this import

// Interface for JWT payload
export interface JwtPayload {
  userId: string;
  role: string;
  // Add other necessary user info for authorization without hitting DB
}

// Generate Access Token
export const generateAccessToken = (user: IUser): string => {
  const payload: JwtPayload = {
    userId: user._id.toHexString(), // Convert ObjectId to string
    role: user.role,
  };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
};

// Generate Refresh Token and save to DB
export const generateRefreshToken = async (user: IUser): Promise<string> => {
  const payload = {
    userId: user._id.toHexString(),
  };
  // Senior Insight: Refresh token should typically be a longer, more random string
  // and stored securely. Here, we use a JWT for simplicity and consistency with access tokens.
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });

  // Calculate expiration date for database storage
  const expiresAt = new Date(
    Date.now() + _getExpiresInMilliseconds(env.REFRESH_TOKEN_EXPIRES_IN),
  );

  // Save the refresh token to the database
  const newRefreshTokenDoc = new RefreshToken({
    userId: user._id,
    token: refreshToken,
    expiresAt: expiresAt,
  });
  await newRefreshTokenDoc.save();

  return refreshToken;
};

// Helper to convert expiration string (e.g., '15m', '7d') to milliseconds
const _getExpiresInMilliseconds = (expiresIn: string): number => {
  const value = parseInt(expiresIn.slice(0, -1));
  const unit = expiresIn.slice(-1);

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return value * 1000; // Default to seconds if no unit
  }
};

// Verify Access Token
export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (err: unknown) {
    // Changed any to unknown
    if (err instanceof Error && err.name === "TokenExpiredError") {
      throw new CustomError("Access token expired", 401); // 401 Unauthorized
    }
    throw new CustomError("Invalid access token", 401);
  }
};

// Verify Refresh Token and handle rotation
export const verifyAndRotateRefreshToken = async (
  oldRefreshToken: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: string;
}> => {
  try {
    logger.debug(
      `Attempting to verify and rotate refresh token: ${oldRefreshToken}`,
    );
    const decoded = jwt.verify(
      oldRefreshToken,
      env.JWT_REFRESH_SECRET,
    ) as JwtPayload;
    const userId = decoded.userId;
    logger.debug(`Decoded refresh token for userId: ${userId}`);

    // Find the refresh token in the database
    const storedToken = await RefreshToken.findOne({
      userId,
      token: oldRefreshToken,
    });
    logger.debug(`Stored token found: ${storedToken ? "Yes" : "No"}`);

    // Senior Insight: Implement token rotation and invalidation checks.
    // If token not found or already used (via rotation), consider it compromised.
    if (!storedToken || storedToken.expiresAt < new Date()) {
      // If token is found but expired, the TTL index should handle it, but double-check.
      // If a token isn't found, it's either invalid, expired, or already used/rotated.
      logger.warn(
        `Refresh token for user ${userId} not found or expired/invalidated.`,
      );
      throw new CustomError("Invalid or expired refresh token.", 401);
    }

    // Senior Insight: Crucial step for refresh token rotation - Invalidate the old token
    const deleteResult = await RefreshToken.deleteOne({ _id: storedToken._id });
    logger.debug(
      `Delete old refresh token result: ${JSON.stringify(deleteResult)}`,
    );

    // Find the user to generate new tokens with correct role
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new CustomError(
        "User associated with refresh token not found or inactive.",
        401,
      );
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = await generateRefreshToken(user); // Generate and save a new refresh token

    logger.info(`Refresh token rotated for user ${user.username}.`);
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      userId: user._id.toHexString(),
      role: user.role,
    };
  } catch (err: unknown) {
    // Changed any to unknown
    logger.error("Error verifying or rotating refresh token:", err);
    if (err instanceof Error && err.name === "TokenExpiredError") {
      throw new CustomError("Refresh token expired", 401);
    }
    throw new CustomError("Invalid refresh token", 401);
  }
};

// Invalidate Refresh Token (logout)
export const invalidateRefreshToken = async (
  refreshToken: string,
): Promise<void> => {
  // Senior Insight: Find and delete the refresh token from the database.
  // This effectively logs out the user.
  const result = await RefreshToken.deleteOne({ token: refreshToken });
  if (result.deletedCount === 0) {
    logger.warn(
      "Attempted to invalidate a refresh token that was not found:",
      refreshToken,
    );
    // Even if not found, we still return success to the client for security reasons
    // (don't reveal if a token exists or not).
  }
  logger.info("Refresh token invalidated.");
};
