import User from '../models/User';
import Household from '../models/Household';
import { CustomError } from '../middleware/error.middleware';
import logger from '../utils/logger';
import { IUser } from '../types/user.d'; // Import IUser for type hints

// Register a new user and create their initial household
export const registerUser = async (username: string, email: string, password: string, householdName: string): Promise<IUser> => {
  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      throw new CustomError('Username or email already exists.', 409);
    }

    const user = new User({ username, email, password, role: 'owner', isActive: true });
    const household = new Household({
      name: householdName,
      owner: user._id,
      members: [user._id],
    });

    if (process.env.NODE_ENV === 'test') {
      await user.save();
      await household.save();
      user.households = user.households.concat(household._id);
      await user.save();
      logger.info(`User ${user.username} registered and household ${household.name} created.`);
      return user;
    } else {
      const session = await User.startSession();
      session.startTransaction();
      try {
        await user.save({ session });
        await household.save({ session });
        user.households = user.households.concat(household._id);
        await user.save({ session });

        await session.commitTransaction();
        logger.info(`User ${user.username} registered and household ${household.name} created.`);
        return user;
      } catch (transactionError: unknown) {
        await session.abortTransaction();
        logger.error('Transaction failed during user registration:', transactionError);
        throw transactionError;
      } finally {
        session.endSession();
      }
    }
  } catch (error: unknown) {
    if (error instanceof CustomError) {
      throw error;
    }
    // Check for MongoDB duplicate key error
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) {
      throw new CustomError('Username or email already exists.', 409);
    }
    // Handle other errors
    if (error instanceof Error) {
      throw new CustomError(`Registration failed: ${error.message}`, 500);
    }
    throw new CustomError('An unknown error occurred during registration.', 500);
  }
};

// Login an existing user
export const loginUser = async (email: string, password: string): Promise<IUser> => {
  try {
    // Only fetch active users. Senior insight: Soft delete requires filtering.
    const user = await User.findOne({ email, isActive: true }).select('+password').populate('households');
    if (!user) {
      throw new CustomError('Invalid credentials.', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new CustomError('Invalid credentials.', 401);
    }

    logger.info(`User ${user.username} logged in successfully.`);
    return user;
  } catch (error: unknown) {
    if (error instanceof CustomError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new CustomError(`Login failed: ${error.message}`, 500);
    }
    throw new CustomError('An unknown error occurred during login.', 500);
  }
};

// Get all users (for admin/monitoring purposes)
export const getAllUsers = async (): Promise<IUser[]> => {
  // Senior insight: Only fetch active users by default.
  // In a real app, this would likely be an admin-only endpoint.
  const users = await User.find({ isActive: true }).populate('households', 'name'); // Only populate household name
  logger.info(`Fetched ${users.length} active users.`);
  return users;
};

// Get a single user by ID
export const getUserById = async (userId: string): Promise<IUser> => {
  try {
    // Senior insight: Ensure user is active.
    const user = await User.findOne({ _id: userId, isActive: true }).populate('households', 'name');
    if (!user) {
      throw new CustomError('User not found.', 404);
    }
    logger.info(`Fetched user with ID: ${userId}`);
    return user;
  } catch (error: unknown) {
    if (error instanceof CustomError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new CustomError(`Failed to fetch user: ${error.message}`, 500);
    }
    throw new CustomError('An unknown error occurred while fetching user.', 500);
  }
};

// Update a user's profile
export const updateUser = async (userId: string, updateData: Partial<IUser>): Promise<IUser> => {
  try {
    // Senior insight: Prevent sensitive fields from being updated directly via this endpoint
    // like password (which has its own dedicated flow) or _id.
    const safeUpdateData = { ...updateData }; // Create a shallow copy
    if (safeUpdateData.password) {
      delete safeUpdateData.password; // Remove password from updateData
      throw new CustomError('Password cannot be updated directly through this function. Please use a dedicated password reset/change mechanism.', 400);
    }

    // Check if new email/username already exists for another active user
    if (safeUpdateData.email || safeUpdateData.username) {
      const existingUser = await User.findOne({
        $or: [
          { email: safeUpdateData.email },
          { username: safeUpdateData.username }
        ],
        _id: { $ne: userId }, // Exclude current user
        isActive: true // Only check against active users
      });
      if (existingUser) {
        throw new CustomError('Username or email already taken by another user.', 409);
      }
    }

    // Find and update the user. useFindAndModify is deprecated, so use findOneAndUpdate.
    // { new: true } returns the updated document.
    // { runValidators: true } ensures schema validation runs on update.
    const user = await User.findOneAndUpdate(
      { _id: userId, isActive: true }, // Ensure we only update active users
      { $set: safeUpdateData }, // Use $set to update specific fields
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new CustomError('User not found or not active.', 404);
    }
    logger.info(`User with ID: ${userId} updated.`);
    return user;
  } catch (error: unknown) {
    if (error instanceof CustomError) {
      throw error;
    }
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) { // MongoDB duplicate key error
      throw new CustomError('Username or email already taken.', 409);
    }
    if (error instanceof Error) {
      throw new CustomError(`Failed to update user: ${error.message}`, 500);
    }
    throw new CustomError('An unknown error occurred while updating user.', 500);
  }
};

// "Delete" a user (soft delete)
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    // Senior insight: Always consider consequences of deletion.
    // Soft delete is preferred. For hard delete, manage related data (households, devices, etc.).
    const user = await User.findOneAndUpdate(
      { _id: userId, isActive: true },
      { $set: { isActive: false } }, // Perform soft delete
      { new: true }
    );

    if (!user) {
      throw new CustomError('User not found or already inactive.', 404);
    }
    logger.info(`User with ID: ${userId} soft-deleted.`);

    // Senior insight: In a real system, soft-deleting a user might trigger:
    // 1. Removing them from all households (or setting their role to inactive)
    // 2. Transferring ownership of households if they were an owner
    // 3. Deactivating/transferring ownership of their devices
    // 4. Archiving their data for compliance/analytics
    // For now, we only soft-delete the user document itself.
  } catch (error: unknown) {
    if (error instanceof CustomError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new CustomError(`Failed to delete user: ${error.message}`, 500);
    }
    throw new CustomError('An unknown error occurred while deleting user.', 500);
  }
};