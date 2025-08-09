// smart-home-automation-api/src/controllers/user.controller.ts
import { Request, Response, NextFunction } from "express";
import * as userService from "../services/user.service"; // Import user service
import { CustomError } from "../middleware/error.middleware"; // Custom error (will be created in error handling pillar)
import logger from "../utils/logger";

// Register a new user
export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { username, email, password, householdName } = req.body;

    // Senior insight: Input validation is critical at the controller level (before service).
    // We'll use express-validator later for more robust validation.
    if (!username || !email || !password || !householdName) {
      throw new CustomError(
        "Missing required fields: username, email, password, householdName",
        400,
      );
    }

    const user = await userService.registerUser(
      username,
      email,
      password,
      householdName,
    );

    // Senior insight: Do not send hashed password back in response.
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      households: user.households,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(201).json({
      message: "User registered successfully and household created.",
      user: userResponse,
    });
  } catch (error) {
    logger.error("Error registering user:", error);
    next(error); // Pass error to global error handler
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

    if (!email || !password) {
      throw new CustomError("Email and password are required", 400);
    }

    const user = await userService.loginUser(email, password);

    // Senior insight: Do not send hashed password back in response.
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      households: user.households,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({ message: "Login successful.", user: userResponse }); // JWT token will be added later
  } catch (error) {
    logger.error("Error logging in user:", error);
    next(error); // Pass error to global error handler
  }
};
