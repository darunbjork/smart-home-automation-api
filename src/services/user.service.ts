// smart-home-automation-api/src/services/user.service.ts
import User from '../models/User';
import Household from '../models/Household';
import { CustomError } from '../middleware/error.middleware'; // Custom error
import logger from '../utils/logger';
import { Types } from 'mongoose';

// Register a new user and create their initial household
export const registerUser = async (username: string, email: string, password: string, householdName: string) => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      // Senior insight: Provide specific, but not exploitable, error messages.
      // E.g., don't say "email already exists" if only username exists, to prevent enumeration attacks.
      throw new CustomError('Username or email already exists.', 409); // 409 Conflict
    }

    // Create the new user
    const user = new User({ username, email, password, role: 'owner' });

    // Create the new household for the user
    const household = new Household({
      name: householdName,
      owner: user._id, // Set the current user as the owner
      members: [user._id], // Add the user as a member
    });

    // Senior insight: Use transactions for operations that modify multiple documents
    // and need atomicity (all or nothing). This prevents inconsistent states.
    // MongoDB replica sets (which we implicitly get with Docker Compose single instance
    // but would be explicit in production) support transactions.
    const session = await User.startSession();
    session.startTransaction();
    try {
      await user.save({ session }); // Save user within the transaction
      await household.save({ session }); // Save household within the transaction

      // // Link household to user
      // user.households.push(household._id);
      // await user.save({ session }); // Save user again to update households array

      // Link household to user
      // The explicit initialization above should help, but keeping this cast for safety
      (user.households as Types.ObjectId[]).push(household._id);
       await user.save({ session }); // Save user again to update households array
      await session.commitTransaction(); // Commit changes if all successful
      logger.info(`User ${user.username} registered and household ${household.name} created.`);
      return user; // Return the user object (hashed password won't be in it due to model design)
    } catch (transactionError) {
      await session.abortTransaction(); // Abort if any error occurs
      logger.error('Transaction failed during user registration:', transactionError);
      throw transactionError; // Re-throw to be caught by outer try-catch
    } finally {
      session.endSession(); // Always end the session
    }

  } catch (error: any) {
    if (error.code === 11000) { // MongoDB duplicate key error code
      throw new CustomError('Username or email already exists.', 409);
    }
    throw new CustomError(`Registration failed: ${error.message}`, error.statusCode || 500);
  }
};

// Login an existing user
export const loginUser = async (email: string, password: string) => {
  try {
    const user = await User.findOne({ email }).select('+password').populate('households'); // Fetch hashed password and populate households
    if (!user) {
      throw new CustomError('Invalid credentials.', 401); // 401 Unauthorized
    }

    // Compare provided password with hashed password using the instance method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new CustomError('Invalid credentials.', 401);
    }

    logger.info(`User ${user.username} logged in successfully.`);
    return user; // Will contain populated households, but not hashed password when returned from service
  } catch (error: any) {
    throw new CustomError(`Login failed: ${error.message}`, error.statusCode || 500);
  }
};