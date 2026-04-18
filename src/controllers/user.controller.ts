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
      return h;
    });
  }
  return userResponse;
};

// Set refresh token as HttpOnly cookie
const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  res.cookie("jwt", refreshToken, {
    httpOnly: true, 
    secure: env.NODE_ENV === "production", 
    sameSite: "strict", 
    maxAge: _getExpiresInMilliseconds(env.REFRESH_TOKEN_EXPIRES_IN),
  });
};

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
    const { username, email, password, householdName } = req.body;
    const user = await userService.registerUser(
      username,
      email,
      password,
      householdName,
    );
    // If user is created successfully, send 201
    res.status(201).json({
      message: "User registered successfully and household created.",
      user: prepareUserResponse(user),
    });
  } catch (error) {
    logger.error({ error }, "Error registering user.");
    if (error instanceof CustomError && error.statusCode) {
      res.status(error.statusCode).json({
        error: {
          message: error.message,
        },
      });
    } else {
      next(error);
    }
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

    setRefreshTokenCookie(res, refreshToken);
    res.status(200).json({
      message: "Login successful.",
      user: prepareUserResponse(user),
      accessToken,
    });
  } catch (error) {
    logger.error({ error }, "Error logging in user.");
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
    setRefreshTokenCookie(res, newRefreshToken);
    res.status(200).json({
      message: "Access token refreshed successfully.",
      accessToken,
      user: { userId, role },
    });
  } catch (error) {
    logger.error({ error }, "Error refreshing access token.");
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
      return res
        .status(204)
        .json({ message: "No refresh token to invalidate." }); 
    }
    const refreshToken = cookies.jwt;

    await authService.invalidateRefreshToken(refreshToken);

    // Clear the refresh token cookie
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(204).send();
  } catch (error) {
    logger.error({ error }, "Error logging out user.");
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
    logger.debug(
      `Fetching all users for user ${req.user?.userId} (role: ${req.user?.role})`,
    );
    const users = await userService.getAllUsers();
    res.status(200).json({ users: users.map(prepareUserResponse) });
  } catch (error) {
    logger.error({ error }, "Error fetching all users.");
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
    if (req.user?.role !== "owner" && req.user?.userId !== req.params.id) {
      throw new CustomError(
        "Forbidden: You can only view your own profile unless you are an owner.",
        403,
      );
    }

    res.status(200).json({ user: prepareUserResponse(user) });
  } catch (error) {
    logger.error({ error }, `Error fetching user with ID ${req.params.id}.`);
    next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    logger.debug(
      `Updating user ${req.params.id} for user ${req.user?.userId} (role: ${req.user?.role})`,
    );

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
    logger.error({ error }, `Error updating user with ID ${req.params.id}.`);
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
    logger.error(
      { error },
      `Error soft-deleting user with ID ${req.params.id}.`,
    );
    next(error);
  }
};
