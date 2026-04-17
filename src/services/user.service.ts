import User from "../models/User";
import Household from "../models/Household"; 
import { CustomError } from "../middleware/error.middleware";
import logger from "../utils/logger";
import { IUser } from "../types/user.d";
import { generateAccessToken, generateRefreshToken } from "./auth.service";

export const registerUser = async (
  username: string,
  email: string,
  password: string,
  householdName: string, 
): Promise<IUser> => {
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new CustomError("A user with this email already exists.", 409);
    }

    const user = new User({
      username,
      email,
      password,
      role: "owner",
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
    return user;
  } catch (error: unknown) {
    if (error instanceof CustomError) {
      // Check if it's already a CustomError
      throw error; // Re-throw the CustomError directly
    }
    const asError = error as {
      code?: number;
      message: string;
      statusCode?: number;
    };
    if (asError.code === 11000) {
      // MongoDB duplicate key error
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
): Promise<{ user: IUser; accessToken: string; refreshToken: string }> => {
  try {
    const user = await User.findOne({ email, isActive: true })
      .select("+password")
      .populate("households");
    if (!user) {
      throw new CustomError("Invalid credentials.", 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new CustomError("Invalid credentials.", 401);
    }

    logger.debug(
      `User object before token generation: ${JSON.stringify(user)}`,
    );

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user); 

    logger.info(`User ${user.username} logged in successfully.`);
    return { user, accessToken, refreshToken }; // Return tokens
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    throw new CustomError(error.message, error.statusCode || 500);
  }
};

export const getAllUsers = async (): Promise<IUser[]> => {
  const users = await User.find({ isActive: true }).populate(
    "households",
    "name",
  );
  logger.info(`Fetched ${users.length} active users.`);
  return users;
};

export const getUserById = async (userId: string): Promise<IUser> => {
  const user = await User.findOne({ _id: userId, isActive: true }).populate(
    "households",
    "name",
  );
  if (!user) {
    throw new CustomError("User not found.", 404);
  }
  logger.info(`Fetched user with ID: ${userId}`);
  return user;
};

export const updateUser = async (
  userId: string,
  updateData: Partial<IUser>,
): Promise<IUser> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...safeUpdateData } = updateData;
    if (safeUpdateData.email || safeUpdateData.username) {
      const existingUser = await User.findOne({
        $or: [
          { email: safeUpdateData.email },
          { username: safeUpdateData.username },
        ],
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
    );

    if (!user) {
      throw new CustomError("User not found or not active.", 404);
    }
    logger.info(`User with ID: ${userId} updated.`);
    return user;
  } catch (error: unknown) {
    const asError = error as {
      code?: number;
      message: string;
      statusCode?: number;
    };
    if (asError.code === 11000) {
      // MongoDB duplicate key error
      throw new CustomError("Username or email already taken.", 409);
    }
    throw new CustomError(
      `Failed to update user: ${asError.message}`,
      asError.statusCode || 500,
    );
  }
};


export const deleteUser = async (userId: string): Promise<void> => {
  const user = await User.findOneAndUpdate(
    { _id: userId, isActive: true },
    { $set: { isActive: false } },
    { new: true },
  );

  if (!user) {
    throw new CustomError("User not found or already inactive.", 404);
  }
  logger.info(`User with ID: ${userId} soft-deleted.`);

};
export { generateAccessToken };
