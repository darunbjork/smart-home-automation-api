// smart-home-automation-api/src/routes/user.routes.ts
import { Router } from "express";
import * as userController from "../controllers/user.controller";
// Import our validation middleware
import {
  validateRegisterUser,
  validateLoginUser,
  validateUpdateUser,
} from "../middleware/validation.middleware";

const router = Router();

// Authentication Routes
router.post("/register", validateRegisterUser, userController.registerUser);
router.post("/login", validateLoginUser, userController.loginUser);

// User Management Routes (will add authentication middleware later)
/**
 * @swagger
 * /users:
 * get:
 * summary: Get all active users
 * tags: [User Management]
 * description: Retrieves a list of all active users in the system. (Admin-only in production)
 * responses:
 * 200:
 * description: A list of users.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * users:
 * type: array
 * items:
 * $ref: '#/components/schemas/UserResponse'
 * 500:
 * $ref: '#/components/responses/InternalServerError'
 */
router.get("/", userController.getAllUsers);

/**
 * @swagger
 * /users/{id}:
 * get:
 * summary: Get a single user by ID
 * tags: [User Management]
 * description: Retrieves details of a single active user by their ID.
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * example: 60f8b8e0c8d7c1a0c8d7c1a0 # Example User ID
 * description: The ID of the user to retrieve.
 * responses:
 * 200:
 * description: User data.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * user:
 * $ref: '#/components/schemas/UserResponse'
 * 404:
 * $ref: '#/components/responses/NotFound'
 * 500:
 * $ref: '#/components/responses/InternalServerError'
 */
router.get("/:id", userController.getUserById);

/**
 * @swagger
 * /users/{id}:
 * patch:
 * summary: Update a user's profile
 * tags: [User Management]
 * description: Updates details for an existing active user.
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * example: 60f8b8e0c8d7c1a0c8d7c1a0
 * description: The ID of the user to update.
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * username:
 * type: string
 * example: "new_john_doe"
 * email:
 * type: string
 * format: email
 * example: "new.john.doe @example.com"
 * role:
 * type: string
 * enum: ["owner", "member"]
 * example: "member"
 * responses:
 * 200:
 * description: User updated successfully.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * user:
 * $ref: '#/components/schemas/UserResponse'
 * 400:
 * $ref: '#/components/responses/BadRequest'
 * 404:
 * $ref: '#/components/responses/NotFound'
 * 409:
 * $ref: '#/components/responses/Conflict'
 * 500:
 * $ref: '#/components/responses/InternalServerError'
 */
router.patch("/:id", validateUpdateUser, userController.updateUser);

/**
 * @swagger
 * /users/{id}:
 * delete:
 * summary: Soft-delete a user
 * tags: [User Management]
 * description: Marks an active user as inactive instead of permanent deletion.
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * example: 60f8b8e0c8d7c1a0c8d7c1a0
 * description: The ID of the user to soft-delete.
 * responses:
 * 200:
 * description: User soft-deleted successfully.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * 404:
 * $ref: '#/components/responses/NotFound'
 * 500:
 * $ref: '#/components/responses/InternalServerError'
 */
router.delete("/:id", userController.deleteUser);

export default router;
