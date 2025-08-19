// smart-home-automation-api/src/routes/household.routes.ts
import { Router } from "express";
import * as householdController from "../controllers/household.controller";
import { authenticate } from "../middleware/auth.middleware";
import {
  validateInviteUser,
  validateInvitationToken,
  validateLeaveHousehold,
  validateHouseholdParam,
} from "../middleware/validation.middleware";

const router = Router();

// All household routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Household Management
 *   description: API for managing households and membership
 */

/**
 * @swagger
 * /households:
 *   get:
 *     summary: Get all households for the authenticated user
 *     tags: [Household Management]
 *     description: Retrieves a list of all households the authenticated user is a member of.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of households.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 households:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/HouseholdResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/", householdController.getHouseholds);

/**
 * @swagger
 * /households/leave:
 *   post:
 *     summary: Leave a household
 *     tags: [Household Management]
 *     description: Allows a user to leave a household they are a member of. Owners cannot leave; they must delete the household.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               householdId:
 *                 type: string
 *                 example: "60f8b8e0c8d7c1a0c8d7c1a1"
 *     responses:
 *       200:
 *         description: Successfully left the household.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  "/leave",
  validateLeaveHousehold,
  householdController.leaveHousehold,
);

/**
 * @swagger
 * /households/invite:
 *   post:
 *     summary: Invite a user to a household (Owner only)
 *     tags: [Household Management]
 *     description: Sends an invitation to a new or existing user via email to join a household. Requires the authenticated user to be the household owner.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               householdId:
 *                 type: string
 *                 example: "60f8b8e0c8d7c1a0c8d7c1a1"
 *               inviteeEmail:
 *                 type: string
 *                 format: email
 *                 example: "member@example.com"
 *     responses:
 *       201:
 *         description: Invitation sent successfully.
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
router.post("/invite", validateInviteUser, householdController.inviteUser);

/**
 * @swagger
 * /households/invitations:
 *   get:
 *     summary: Get all pending invitations for the authenticated user
 *     tags: [Household Management]
 *     description: Retrieves a list of all pending invitations for the authenticated user, based on their email.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of invitations.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/invitations", householdController.getInvitations);

/**
 * @swagger
 * /households/invitations/accept:
 *   post:
 *     summary: Accept a household invitation
 *     tags: [Household Management]
 *     description: Accepts a pending invitation using the provided invitation token. The user will be added to the household.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
 *     responses:
 *       200:
 *         description: Invitation accepted successfully.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  "/invitations/accept",
  validateInvitationToken,
  householdController.acceptInvitation,
);

/**
 * @swagger
 * /households/invitations/decline:
 *   post:
 *     summary: Decline a household invitation
 *     tags: [Household Management]
 *     description: Declines and deletes a pending invitation using the provided invitation token.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
 *     responses:
 *       200:
 *         description: Invitation declined successfully.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  "/invitations/decline",
  validateInvitationToken,
  householdController.declineInvitation,
);

/**
 * @swagger
 * /households/{id}:
 *   get:
 *     summary: Get a single household by ID
 *     tags: [Household Management]
 *     description: Retrieves details for a single household the authenticated user is a member of.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "60f8b8e0c8d7c1a0c8d7c1a1"
 *     responses:
 *       200:
 *         description: Household details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HouseholdResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  "/:id",
  validateHouseholdParam,
  householdController.getHouseholdById,
);

/**
 * @swagger
 * /households/{id}:
 *   delete:
 *     summary: Delete a household (Owner only)
 *     tags: [Household Management]
 *     description: Deletes a household and all its associated devices and invitations. Requires the authenticated user to be the household owner.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "60f8b8e0c8d7c1a0c8d7c1a1"
 *     responses:
 *       200:
 *         description: Household and all associated data deleted successfully.
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
  validateHouseholdParam,
  householdController.deleteHousehold,
);

export default router;
