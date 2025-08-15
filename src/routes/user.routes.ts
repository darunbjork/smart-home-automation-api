// smart-home-automation-api/src/routes/user.routes.ts
import { Router } from "express";
import * as userController from "../controllers/user.controller";
import {
  validateRegisterUser,
  validateLoginUser,
  validateUpdateUser,
} from "../middleware/validation.middleware";
import { authenticate, authorize } from "../middleware/auth.middleware"; // NEW: Import auth middleware

const router = Router();

// Authentication Routes
router.post("/register", validateRegisterUser, userController.registerUser);
router.post("/login", validateLoginUser, userController.loginUser);
router.get("/refresh", userController.refreshAccessToken); // New endpoint for token refresh
router.post("/logout", userController.logoutUser); // New endpoint for logout

// User Management Routes (now protected)
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all active users (Requires authentication, Owner role)
 *     tags: [User Management]
 *     description: Retrieves a list of all active users in the system. Requires authentication and 'owner' role.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of users.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/", authenticate, authorize(["owner"]), userController.getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a single user by ID (Requires authentication)
 *     tags: [User Management]
 *     description: Retrieves details of a single active user by their ID. Requires authentication. Users can view their own profile or if they are an 'owner', any profile.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 60f8b8e0c8d7c1a0c8d7c1a0 # Example User ID
 *         description: The ID of the user to retrieve.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/UserResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/:id", authenticate, userController.getUserById); // Authorization check moved to controller for flexibility

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     summary: Update a user's profile (Requires authentication)
 *     tags: [User Management]
 *     description: Updates details for an existing active user. Requires authentication. Users can update their own profile or if they are an 'owner', any profile.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 60f8b8e0c8d7c1a0c8d7c1a0
 *         description: The ID of the user to update.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: "new_john_doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "new.john.doe @example.com"
 *               role:
 *                 type: string
 *                 enum: ["owner", "member"]
 *                 example: "member"
 *     responses:
 *       200:
 *         description: User updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/UserResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch(
  "/:id",
  authenticate,
  validateUpdateUser,
  userController.updateUser,
); // Authorization check moved to controller for flexibility

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Soft-delete a user (Requires authentication, Owner role)
 *     tags: [User Management]
 *     description: Marks an active user as inactive instead of permanent deletion. Requires authentication and 'owner' role.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 60f8b8e0c8d7c1a0c8d7c1a0
 *         description: The ID of the user to soft-delete.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User soft-deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete(
  "/:id",
  authenticate,
  authorize(["owner"]),
  userController.deleteUser,
); // Only owners can delete
// Note: Owners cannot delete themselves is handled in controller for granular control.

export default router;
