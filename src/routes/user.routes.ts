import { Router } from "express";
import * as userController from "../controllers/user.controller";
import {
  validateRegisterUser,
  validateLoginUser,
} from "../middleware/validation.middleware";
import { authenticate } from "../middleware/auth.middleware";
import { requireTrustedOrigin } from "../middleware/origin.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { updateUserSchema } from "../schemas/user.schema";
import {
  loginLimiter,
  refreshLimiter,
  registerLimiter,
} from "../middleware/rate-limit.middleware";

const router = Router();

// --- Authentication ---
router.post(
  "/register",
  registerLimiter,
  validateRegisterUser,
  userController.registerUser,
);
router.post(
  "/login",
  loginLimiter,
  validateLoginUser,
  userController.loginUser,
);
router.post(
  "/refresh",
  refreshLimiter,
  requireTrustedOrigin,
  userController.refreshAccessToken,
);
router.post("/logout", requireTrustedOrigin, userController.logoutUser);

// --- Profile ---
// MUST be declared before "/:id" or Express matches "profile" as an id.
router.get("/profile", authenticate, userController.getProfile);

// --- Self-service user management (only ever your own record) ---
router.get("/:id", authenticate, userController.getUserById);
router.patch(
  "/:id",
  authenticate,
  validateBody(updateUserSchema),
  userController.updateUser,
);

// Removed endpoints (the frontend must not call them):
//   GET    /users       -> deleted (global user list)
//   DELETE /users/:id   -> deleted (delete anyone); DELETE /users/me arrives in T11

export default router;
