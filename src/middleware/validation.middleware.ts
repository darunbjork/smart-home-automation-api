// smart-home-automation-api/src/middleware/validation.middleware.ts
import {
  validationResult,
  body,
  param,
  ValidationError,
} from "express-validator";
import { Request, Response, NextFunction } from "express";
import { CustomError } from "./error.middleware";

// Middleware to check validation results
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Senior insight: Consolidated error messages are better for clients.
    // Return a 400 Bad Request with specific validation errors.
    throw new CustomError(
      "Validation failed: " +
        errors
          .array()
          .map((e: ValidationError) => e.msg)
          .join(", "),
      400,
    );
  }
  next();
};

// Validation rules for user registration
export const validateRegisterUser = [
  body("username")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
  body("householdName")
    .isLength({ min: 3, max: 50 })
    .withMessage("Household name must be between 3 and 50 characters"),
  validateRequest, // Apply our custom validation checker
];

// Validation rules for user login
export const validateLoginUser = [
  body("email").isEmail().withMessage("Please provide a valid email address"),
  body("password").notEmpty().withMessage("Password cannot be empty"),
  validateRequest,
];

// Validation rules for user update
export const validateUpdateUser = [
  body("username")
    .optional() // Field is optional for update
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("role")
    .optional()
    .isIn(["owner", "member"])
    .withMessage('Role must be either "owner" or "member"'),
  validateRequest,
];

// Validation rules for device creation
export const validateCreateDevice = [
  body("name")
    .isLength({ min: 1, max: 50 })
    .withMessage("Device name must be between 1 and 50 characters")
    .trim(),
  body("type")
    .isLength({ min: 1, max: 30 })
    .withMessage("Device type must be between 1 and 30 characters")
    .trim(),
  body("householdId").isMongoId().withMessage("Invalid household ID"),
  body("data")
    .optional()
    .isObject()
    .withMessage("Device data must be a JSON object"),
  validateRequest,
];

// Validation rules for device update
export const validateUpdateDevice = [
  body("name")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("Device name must be between 1 and 50 characters")
    .trim(),
  body("type")
    .optional()
    .isLength({ min: 1, max: 30 })
    .withMessage("Device type must be between 1 and 30 characters")
    .trim(),
  body("status")
    .optional()
    .isIn(["online", "offline", "unknown"])
    .withMessage("Invalid device status"),
  body("data")
    .optional()
    .isObject()
    .withMessage("Device data must be a JSON object"),
  validateRequest,
];

// Validation rules for fetching/updating/deleting a device
export const validateDeviceParam = [
  param("id").isMongoId().withMessage("Invalid device ID"),
  validateRequest,
];
