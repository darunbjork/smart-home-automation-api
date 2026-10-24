import { Request, Response, NextFunction } from "express";
import * as userService from "../services/user.service";
import * as authService from "../services/auth.service";
import { CustomError } from "../middleware/error.middleware";
import { IUser } from "../types/user.d";
import {
  attachRefreshToken,
  clearRefreshCookie,
  readRefreshToken,
} from "./session.helpers";

export interface HouseholdSummary {
  _id: string;
  name: string;
  ownerId: string;
}

export interface UserResponse {
  _id: string;
  username: string;
  email: string;
  role: string;
  households: HouseholdSummary[];
  createdAt?: Date;
  updatedAt?: Date;
}

// One User shape for register, login, profile, get and update.
// The client derives the per-household role from ownerId === user._id;
// the global `role` field is deprecated and ignored by Hearth.
export const toUserResponse = (user: IUser): UserResponse => {
  const populated = user.toObject({ getters: true, virtuals: false }) as {
    _id: unknown;
    username: string;
    email: string;
    role: string;
    households?: unknown[];
    createdAt?: Date;
    updatedAt?: Date;
  };
  const households: HouseholdSummary[] = (populated.households ?? [])
    .map((h: unknown) => {
      if (!h || typeof h !== "object" || !("_id" in h)) return null;
      const doc = h as { _id?: unknown; name?: unknown; owner?: unknown };
      if (doc._id === undefined || typeof doc.name !== "string") return null;
      const ownerRef = doc.owner;
      const ownerId =
        ownerRef !== null && typeof ownerRef === "object" && "_id" in ownerRef
          ? String((ownerRef as { _id: unknown })._id)
          : String(ownerRef);
      return { _id: String(doc._id), name: doc.name, ownerId };
    })
    .filter((h): h is HouseholdSummary => h !== null);

  return {
    _id: String(populated._id),
    username: populated.username,
    email: populated.email,
    role: populated.role,
    households,
    createdAt: populated.createdAt,
    updatedAt: populated.updatedAt,
  };
};

// Register a new user
export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { username, email, password, householdName } = req.body;
    const user = await userService.registerUser(
      username,
      email,
      password,
      householdName,
    );
    const accessToken = authService.generateAccessToken(user);
    const refresh = await authService.issueRefreshToken(user._id);
    const mobile = attachRefreshToken(req, res, refresh);
    res.status(201).json({
      message: "User registered successfully and household created.",
      user: toUserResponse(user),
      accessToken,
      ...mobile,
    });
  } catch (error) {
    next(error);
  }
};

// Login a user
export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refresh } = await userService.loginUser(
      email,
      password,
    );

    const mobile = attachRefreshToken(req, res, refresh);
    res.status(200).json({
      message: "Login successful.",
      user: toUserResponse(user),
      accessToken,
      ...mobile,
    });
  } catch (error) {
    next(error);
  }
};

// POST /users/refresh — rotation with reuse detection.
// Web: reads the hearth_rt cookie. Mobile (X-Client: mobile): reads
// "Authorization: Refresh <token>" and gets the successor in the body.
export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const presented = readRefreshToken(req);
    if (!presented) {
      throw new CustomError(
        "No refresh token provided.",
        401,
        "REFRESH_INVALID",
      );
    }
    const { accessToken, refresh } =
      await authService.rotateRefreshToken(presented);
    const mobile = attachRefreshToken(req, res, refresh);
    res
      .status(200)
      .json({ message: "Token refreshed.", accessToken, ...mobile });
  } catch (error) {
    if (error instanceof CustomError && error.statusCode === 401) {
      clearRefreshCookie(res);
    }
    next(error);
  }
};

// POST /users/logout — revokes the whole session family and clears the cookie.
export const logoutUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const presented = readRefreshToken(req);
    if (presented) await authService.revokeFamilyByToken(presented);
    clearRefreshCookie(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// GET /users/profile
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new CustomError("Unauthorized.", 401);

    const user = await userService.getProfile(userId);
    if (!user) throw new CustomError("User not found.", 404);

    res.status(200).json({ user: toUserResponse(user) });
  } catch (error) {
    next(error);
  }
};

// GET /users/:id — self only; anyone else gets 404 (no existence probing).
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new CustomError("Unauthorized.", 401);
    if (req.params.id !== userId) {
      throw new CustomError("User not found.", 404);
    }

    const user = await userService.getProfile(userId);
    if (!user) throw new CustomError("User not found.", 404);

    res.status(200).json({ user: toUserResponse(user) });
  } catch (error) {
    next(error);
  }
};

// PATCH /users/:id — self only. Body is already validated with a strict
// Zod schema: only `username` can arrive here.
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new CustomError("Unauthorized.", 401);
    if (req.params.id !== userId) {
      throw new CustomError("User not found.", 404);
    }

    const body: { username?: string } = req.body;
    const updatedUser = await userService.updateUser(
      userId,
      body.username === undefined ? {} : { username: body.username },
    );
    res.status(200).json({
      message: "User updated successfully.",
      user: toUserResponse(updatedUser),
    });
  } catch (error) {
    next(error);
  }
};
