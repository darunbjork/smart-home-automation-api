// smart-home-automation-api/src/services/user.service.ts
import User from "../models/User";
import Household from "../models/Household";
import { CustomError } from "../middleware/error.middleware"; // Custom error
import logger from "../utils/logger";

// Register a new user and create their initial household
export const registerUser = async (
  username: string,
  email: string,
  password: string,
  householdName: string,
) => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      // Senior insight: Provide specific, but not exploitable, error messages.
      // E.g., don't say "email already exists" if only username exists, to prevent enumeration attacks.
      throw new CustomError("Username or email already exists.", 409); // 409 Conflict
    }

    // Create the new user
    const user = new User({ username, email, password, role: "owner" });

    // Create the new household for the user
    const household = new Household({
      name: householdName,
      owner: user._id, // Set the current user as the owner
      members: [user._id],
    });

    // Senior insight: Use transactions for operations that modify multiple documents
    // and need atomicity (all or nothing). This prevents inconsistent states.
    // MongoDB replica sets (which we implicitly get with Docker Compose single instance
    // but would be explicit in production) support transactions.
    await user.save(); // Save user
    await household.save(); // Save household

    // Link household to user
    user.households.push(household._id);
    await user.save(); // Save user again to update households array

    logger.info(
      `User ${user.username} registered and household ${household.name} created.`,
    );
    return user;
  } catch (error: unknown) {
    if (error instanceof CustomError) {
      throw error;
    } else if (error instanceof Error && "code" in error) {
      if (error.code === 11000) {
        throw new CustomError("Username or email already exists.", 409);
      }
      throw new CustomError(
        `Registration failed: ${error.message}`,
        error instanceof CustomError ? error.statusCode : 500,
      );
    } else {
      throw new CustomError(`Registration failed: ${String(error)}`, 500);
    }
  }
};

// Login an existing user
export const loginUser = async (email: string, password: string) => {
  try {
    const user = await User.findOne({ email })
      .select("+password")
      .populate("households"); // Fetch hashed password and populate households
    if (!user) {
      throw new CustomError("Invalid credentials.", 401); // 401 Unauthorized
    }

    // Compare provided password with hashed password using the instance method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new CustomError("Invalid credentials.", 401);
    }

    logger.info(`User ${user.username} logged in successfully.`);
    return user; // Will contain populated households, but not hashed password when returned from service
  } catch (error: unknown) {
    if (error instanceof CustomError) {
      throw error;
    } else if (error instanceof Error) {
      throw new CustomError(
        `Login failed: ${error.message}`,
        error instanceof CustomError ? error.statusCode : 500,
      );
    } else {
      throw new CustomError(`Login failed: ${String(error)}`, 500);
    }
  }
};
