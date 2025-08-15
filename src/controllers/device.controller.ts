// smart-home-automation-api/src/controllers/device.controller.ts
import { Request, Response, NextFunction } from "express";
import * as deviceService from "../services/device.service";
import { CustomError } from "../middleware/error.middleware";
import logger from "../utils/logger";
import { IDevice } from "../models/Device";

// Helper function to prepare device response
const prepareDeviceResponse = (device: IDevice) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { __v, ...deviceResponse } = device.toObject({ getters: true });
  return deviceResponse;
};

// Create a new device
export const createDevice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, type, householdId, data } = req.body;
    // Senior Insight: The user ID comes from the authenticated request object.
    const ownerId = req.user?.userId;
    if (!ownerId) {
      throw new CustomError("User not authenticated.", 401);
    }
    const device = await deviceService.createDevice(
      name,
      type,
      householdId,
      ownerId,
      data,
    );
    res.status(201).json({
      message: "Device created successfully.",
      device: prepareDeviceResponse(device),
    });
  } catch (error) {
    logger.error("Error creating device:", error);
    next(error);
  }
};

// Get all devices in a household (via household ID)
export const getDevicesByHousehold = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { householdId } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      throw new CustomError("User not authenticated.", 401);
    }
    const devices = await deviceService.getDevicesByHousehold(
      householdId,
      userId,
    );
    res.status(200).json({ devices: devices.map(prepareDeviceResponse) });
  } catch (error) {
    logger.error(
      `Error fetching devices for household ${req.params.householdId}:`,
      error,
    );
    next(error);
  }
};

// Get a single device by ID
export const getDeviceById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      throw new CustomError("User not authenticated.", 401);
    }
    const device = await deviceService.getDeviceById(id, userId);
    res.status(200).json({ device: prepareDeviceResponse(device) });
  } catch (error) {
    logger.error(`Error fetching device with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Update a device
export const updateDevice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      throw new CustomError("User not authenticated.", 401);
    }
    const updatedDevice = await deviceService.updateDevice(
      id,
      userId,
      req.body,
    );
    res.status(200).json({
      message: "Device updated successfully.",
      device: prepareDeviceResponse(updatedDevice),
    });
  } catch (error) {
    logger.error(`Error updating device with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Delete a device
export const deleteDevice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      throw new CustomError("User not authenticated.", 401);
    }
    await deviceService.deleteDevice(id, userId);
    res.status(200).json({ message: "Device deleted successfully." });
  } catch (error) {
    logger.error(`Error deleting device with ID ${req.params.id}:`, error);
    next(error);
  }
};
