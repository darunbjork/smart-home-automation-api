// smart-home-automation-api/src/controllers/user.controller.ts
import { Request, Response, NextFunction } from "express";
import * as userService from "../services/user.service";
import * as authService from "../services/auth.service"; // NEW: Import auth service
import { CustomError } from "../middleware/error.middleware";
import logger from "../utils/logger";
import { env } from "../config/env"; // NEW: Import env for token expiry
import { IUser, IHousehold } from "../types/user.d"; // NEW: Import IUser and IHousehold

// Helper function to prepare user response (avoids sending sensitive data)
const prepareUserResponse = (user: IUser) => {
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    password: _password,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    __v: _v,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isActive: _isActive,
    ...userResponse
  } = user.toObject({
    getters: true,
    virtuals: false,
  });

  if (userResponse.households && Array.isArray(userResponse.households)) {
    userResponse.households = userResponse.households.map((h: IHousehold) => {
      // Type guard to check if h is an IHousehold document
      if (
        h &&
        typeof h === "object" &&
        "toObject" in h &&
        typeof h.toObject === "function"
      ) {
        const householdObj = (h as IHousehold).toObject({
          getters: true,
          virtuals: false,
        });
        const {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          __v: _householdV,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          createdAt: _createdAt,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          updatedAt: _updatedAt,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          owner: _owner,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          members: _members,
          ...householdClean
        } = householdObj;
        return householdClean;
      }
      // If h is not a populated IHousehold document (e.g., it's just an ObjectId), return it as is.
      return h;
    });
  }
  return userResponse;
};

// Set refresh token as HttpOnly cookie
const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  // Senior Insight: HttpOnly cookies are crucial for refresh tokens to mitigate XSS attacks.
  // Secure: true for HTTPS only. SameSite: 'strict' or 'lax' for CSRF protection.
  // In production, domain should be specific.
  res.cookie("jwt", refreshToken, {
    httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
    secure: env.NODE_ENV === "production", // Only send over HTTPS in production
    sameSite: "strict", // Protects against CSRF attacks
    maxAge: _getExpiresInMilliseconds(env.REFRESH_TOKEN_EXPIRES_IN), // Match token expiry
  });
};

// Helper to convert expiration string to milliseconds (could be moved to utils)
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
      return value * 1000;
  }
};

// Register a new user
export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  logger.info("Register user request received");
  try {
    const { username, email, password } = req.body;
    const user = await userService.registerUser(username, email, password);
    res.status(201).json({
      message: "User registered successfully and household created.",
      user: prepareUserResponse(user),
    });
  } catch (error) {
    logger.error("Error registering user:", error);
    next(error);
  }
};

// Login a user
export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await userService.loginUser(
      email,
      password,
    );

    setRefreshTokenCookie(res, refreshToken); // Set HttpOnly refresh token cookie

    // Send access token in the response body (or header)
    res.status(200).json({
      message: "Login successful.",
      user: prepareUserResponse(user),
      accessToken,
    });
  } catch (error) {
    logger.error("Error logging in user:", error);
    next(error);
  }
};

// Refresh Access Token
export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Senior Insight: Refresh token is read from HttpOnly cookie.
    const cookies = req.cookies;
    if (!cookies?.jwt) {
      throw new CustomError("No refresh token found in cookies.", 401);
    }
    const refreshToken = cookies.jwt;

    const {
      accessToken,
      refreshToken: newRefreshToken,
      userId,
      role,
    } = await authService.verifyAndRotateRefreshToken(refreshToken);

    // Set the new refresh token as a new HttpOnly cookie
    setRefreshTokenCookie(res, newRefreshToken);

    // Send the new access token to the client
    res.status(200).json({
      message: "Access token refreshed successfully.",
      accessToken,
      user: { userId, role },
    });
  } catch (error) {
    logger.error("Error refreshing access token:", error);
    next(error);
  }
};

// Logout User
export const logoutUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const cookies = req.cookies;
    if (!cookies?.jwt) {
      // No refresh token to invalidate, simply return success (idempotent logout)
      return res
        .status(204)
        .json({ message: "No refresh token to invalidate." }); // 204 No Content
    }
    const refreshToken = cookies.jwt;

    await authService.invalidateRefreshToken(refreshToken);

    // Clear the refresh token cookie
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(204).send(); // 204 No Content for successful logout
  } catch (error) {
    logger.error("Error logging out user:", error);
    next(error);
  }
};

// Get all users
export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Senior Insight: req.user is populated by authenticate middleware.
    logger.debug(
      `Fetching all users for user ${req.user?.userId} (role: ${req.user?.role})`,
    );
    const users = await userService.getAllUsers();
    res.status(200).json({ users: users.map(prepareUserResponse) });
  } catch (error) {
    logger.error("Error fetching all users:", error);
    next(error);
  }
};

// Get a single user by ID
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    logger.debug(
      `Fetching user ${req.params.id} for user ${req.user?.userId} (role: ${req.user?.role})`,
    );
    const user = await userService.getUserById(req.params.id);

    // Senior Insight: Authorization check - users can only view their own profile unless they are an owner.
    if (req.user?.role !== "owner" && req.user?.userId !== req.params.id) {
      throw new CustomError(
        "Forbidden: You can only view your own profile unless you are an owner.",
        403,
      );
    }

    res.status(200).json({ user: prepareUserResponse(user) });
  } catch (error) {
    logger.error(`Error fetching user with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Update a user's profile
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    logger.debug(
      `Updating user ${req.params.id} for user ${req.user?.userId} (role: ${req.user?.role})`,
    );

    // Senior Insight: Authorization check - users can only update their own profile unless they are an owner.
    if (req.user?.role !== "owner" && req.user?.userId !== req.params.id) {
      throw new CustomError(
        "Forbidden: You can only update your own profile unless you are an owner.",
        403,
      );
    }

    const updatedUser = await userService.updateUser(req.params.id, req.body);
    res.status(200).json({
      message: "User updated successfully.",
      user: prepareUserResponse(updatedUser),
    });
  } catch (error) {
    logger.error(`Error updating user with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Delete a user (soft delete)
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    logger.debug(
      `Attempting to soft-delete user ${req.params.id} by user ${req.user?.userId} (role: ${req.user?.role})`,
    );

    // Senior Insight: Strong authorization - typically only owners/admins can delete users.
    if (req.user?.role !== "owner") {
      throw new CustomError(
        "Forbidden: Only an owner can soft-delete user accounts.",
        403,
      );
    }
    // Owners should not be able to delete themselves
    if (req.user?.userId === req.params.id) {
      throw new CustomError(
        "Forbidden: Owners cannot delete their own account via this endpoint.",
        403,
      );
    }

    await userService.deleteUser(req.params.id);
    res.status(200).json({ message: "User soft-deleted successfully." });
  } catch (error) {
    logger.error(`Error soft-deleting user with ID ${req.params.id}:`, error);
    next(error);
  }
};
