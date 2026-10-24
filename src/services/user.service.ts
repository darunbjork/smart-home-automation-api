import bcrypt from "bcryptjs";
import User from "../models/User";
import Household from "../models/Household";
import { CustomError } from "../middleware/error.middleware";
import logger from "../utils/logger";
import { IUser } from "../types/user.d";
import {
  generateAccessToken,
  issueRefreshToken,
  IssuedRefreshToken,
} from "./auth.service";

// Computed once with the same cost as a real hash so a login for an unknown
// email takes about as long as a login for a real one (no user enumeration
// through response timing).
const DUMMY_HASH = bcrypt.hashSync("timing-equalisation-placeholder", 12);

export const registerUser = async (
  username: string,
  email: string,
  password: string,
  householdName: string,
): Promise<IUser> => {
  try {
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      throw new CustomError("A user with this email already exists.", 409);
    }

    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      throw new CustomError("A user with this username already exists.", 409);
    }

    // `role` is deprecated (never used for authorisation) but is kept truthful:
    // a fresh account is not an owner of anything yet beyond its own household.
    const user = new User({
      username,
      email,
      password,
      role: "member",
    });
    await user.save();

    const household = new Household({
      name: householdName,
      owner: user._id,
      members: [user._id],
    });
    await household.save();

    user.households.push(household._id);
    await user.save();

    logger.info(
      `New user ${user.username} registered with a new household: ${household.name}.`,
    );
    await user.populate("households", "name owner");
    return user;
  } catch (error: unknown) {
    if (error instanceof CustomError) {
      throw error;
    }
    const asError = error as {
      code?: number;
      message: string;
      statusCode?: number;
    };
    if (asError.code === 11000) {
      throw new CustomError("Username or email already exists.", 409);
    }
    throw new CustomError(
      `Registration failed: ${asError.message}`,
      asError.statusCode || 500,
    );
  }
};

export const loginUser = async (
  email: string,
  password: string,
): Promise<{
  user: IUser;
  accessToken: string;
  refresh: IssuedRefreshToken;
}> => {
  const user = await User.findOne({ email, isActive: true })
    .select("+password")
    .populate("households", "name owner");

  if (!user) {
    // Burn the same CPU a real comparison would, then fail identically.
    await bcrypt.compare(password, DUMMY_HASH);
    throw new CustomError("Invalid email or password.", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password ?? DUMMY_HASH);
  if (!isMatch) {
    throw new CustomError("Invalid email or password.", 401);
  }

  const accessToken = generateAccessToken(user);
  const refresh = await issueRefreshToken(user._id);

  logger.info(`User ${user.username} logged in successfully.`);
  return { user, accessToken, refresh };
};

// Profile lookup used by GET /users/profile and GET /users/:id (self only).
export const getProfile = async (userId: string): Promise<IUser | null> => {
  return User.findOne({ _id: userId, isActive: true }).populate(
    "households",
    "name owner",
  );
};

// Whitelisted self-update. The route body is already parsed by a strict Zod
// schema, so `role`, `isActive`, `households` and `password` never arrive.
export const updateUser = async (
  userId: string,
  updateData: { username?: string },
): Promise<IUser> => {
  try {
    const safeUpdateData: { username?: string } = {};
    if (updateData.username !== undefined) {
      safeUpdateData.username = updateData.username;
    }

    if (Object.keys(safeUpdateData).length > 0) {
      const existingUser = await User.findOne({
        username: safeUpdateData.username,
        _id: { $ne: userId },
        isActive: true,
      });
      if (existingUser) {
        throw new CustomError(
          "Username or email already taken by another user.",
          409,
        );
      }
    }

    const user = await User.findOneAndUpdate(
      { _id: userId, isActive: true },
      { $set: safeUpdateData },
      { new: true, runValidators: true },
    ).populate("households", "name owner");

    if (!user) {
      throw new CustomError("User not found or not active.", 404);
    }
    logger.info(`User with ID: ${userId} updated.`);
    return user;
  } catch (error: unknown) {
    if (error instanceof CustomError) throw error;
    const asError = error as {
      code?: number;
      message: string;
      statusCode?: number;
    };
    if (asError.code === 11000) {
      throw new CustomError("Username or email already taken.", 409);
    }
    throw new CustomError(
      `Failed to update user: ${asError.message}`,
      asError.statusCode || 500,
    );
  }
};
