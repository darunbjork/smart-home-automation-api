/* eslint-disable @typescript-eslint/no-unused-vars */
// smart-home-automation-api/src/controllers/user.controller.ts
import { Request, Response, NextFunction } from "express";
import * as userService from "../services/user.service";
import logger from "../utils/logger";
import { IUser, IHousehold } from "../types/user.d";

// Helper function to prepare user response (avoids sending sensitive data)
const prepareUserResponse = (user: IUser) => {
  // Senior insight: Centralize response formatting to ensure consistency and security.
  // This removes fields like 'password', '__v', 'isActive' from the client response.

  const {
    password: _password,
    __v: _,
    isActive: _isActive,
    ...userResponse
  } = user.toObject({
    getters: true,
    virtuals: false,
  });

  // If households are populated, ensure their sensitive fields are also removed
  if (userResponse.households && Array.isArray(userResponse.households)) {
    userResponse.households = userResponse.households.map(
      (h: IHousehold & { __v: number }) => {
        const {
          __v: __,
          createdAt: _createdAt,
          updatedAt: _updatedAt,
          ...householdClean
        } = h;
        return householdClean;
      },
    );
  }

  return userResponse;
};

// Register a new user
export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { username, email, password, householdName } = req.body;
    const user = await userService.registerUser(
      username,
      email,
      password,
      householdName,
    );
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
    const user = await userService.loginUser(email, password);
    res
      .status(200)
      .json({ message: "Login successful.", user: prepareUserResponse(user) });
  } catch (error) {
    logger.error("Error logging in user:", error);
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
    const users = await userService.getAllUsers();
    // Senior insight: Map each user through prepareUserResponse to ensure consistency.
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
    const user = await userService.getUserById(req.params.id);
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
    await userService.deleteUser(req.params.id);
    // Senior insight: For deletion, a 204 No Content is often preferred
    // if no data is returned. Or 200 OK with a simple message.
    res.status(200).json({ message: "User soft-deleted successfully." });
  } catch (error) {
    logger.error(`Error soft-deleting user with ID ${req.params.id}:`, error);
    next(error);
  }
};
