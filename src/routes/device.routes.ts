// smart-home-automation-api/src/routes/device.routes.ts
import { Router } from "express";
import * as deviceController from "../controllers/device.controller";
import { authenticate } from "../middleware/auth.middleware";
import {
  validateCreateDevice,
  validateUpdateDevice,
  validateDeviceParam,
} from "../middleware/validation.middleware";

const router = Router();

// All device routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Device Management
 *   description: API for managing smart home devices
 */

/**
 * @swagger
 * /devices:
 *   post:
 *     summary: Create a new device in a household
 *     tags: [Device Management]
 *     description: Creates a new device owned by the authenticated user in a specified household.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Living Room Light"
 *               type:
 *                 type: string
 *                 example: "light"
 *               householdId:
 *                 type: string
 *                 example: "60f8b8e0c8d7c1a0c8d7c1a1"
 *               data:
 *                 type: object
 *                 example: { "on": false, "brightness": 50 }
 *     responses:
 *       201:
 *         description: Device created successfully.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/", validateCreateDevice, deviceController.createDevice);

/**
 * @swagger
 * /devices/household/{householdId}:
 *   get:
 *     summary: Get all devices in a household
 *     tags: [Device Management]
 *     description: Retrieves all devices belonging to a household the authenticated user is a member of.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: householdId
 *         required: true
 *         schema:
 *           type: string
 *           example: "60f8b8e0c8d7c1a0c8d7c1a1"
 *         description: The ID of the household.
 *     responses:
 *       200:
 *         description: A list of devices.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/household/:householdId", deviceController.getDevicesByHousehold);

/**
 * @swagger
 * /devices/{id}:
 *   get:
 *     summary: Get a single device by ID
 *     tags: [Device Management]
 *     description: Retrieves details of a single device if it belongs to a household the authenticated user is a member of.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "60f8b8e0c8d7c1a0c8d7c1a2"
 *         description: The ID of the device.
 *     responses:
 *       200:
 *         description: Device data.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/:id", validateDeviceParam, deviceController.getDeviceById);

/**
 * @swagger
 * /devices/{id}:
 *   patch:
 *     summary: Update a device
 *     tags: [Device Management]
 *     description: Updates details for an existing device. The device must belong to a household the user is a member of.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "60f8b8e0c8d7c1a0c8d7c1a2"
 *         description: The ID of the device to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Main Bedroom Light"
 *               status:
 *                 type: string
 *                 enum: ["online", "offline", "unknown"]
 *                 example: "online"
 *               data:
 *                 type: object
 *                 example: { "on": true, "brightness": 80 }
 *     responses:
 *       200:
 *         description: Device updated successfully.
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
router.patch(
  "/:id",
  validateUpdateDevice,
  validateDeviceParam,
  deviceController.updateDevice,
);

/**
 * @swagger
 * /devices/{id}:
 *   delete:
 *     summary: Delete a device
 *     tags: [Device Management]
 *     description: Deletes a device from a household. The device must belong to a household the user is a member of.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "60f8b8e0c8d7c1a0c8d7c1a2"
 *         description: The ID of the device to delete.
 *     responses:
 *       200:
 *         description: Device deleted successfully.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete("/id", validateDeviceParam, deviceController.deleteDevice);

export default router;
