import { validationResult, body } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { CustomError } from './error.middleware';

// Middleware to check validation results
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed: ' + errors.array().map(e => e.msg).join(', '), 400);
  }
  next();
};

// Validation rules for user registration
export const validateRegisterUser = [
  body('username')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('householdName')
    .isLength({ min: 3, max: 50 }).withMessage('Household name must be between 3 and 50 characters'),
  validateRequest,
];

// Validation rules for user login
export const validateLoginUser = [
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('password').notEmpty().withMessage('Password cannot be empty'),
  validateRequest,
];

// Validation rules for user update
export const validateUpdateUser = [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional()
    .isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('role')
    .optional()
    .isIn(['owner', 'member']).withMessage('Role must be either "owner" or "member"'),
  validateRequest,
];