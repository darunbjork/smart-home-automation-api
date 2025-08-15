// smart-home-automation-api/src/services/device.service.ts
import Device from "../models/Device";
import Household from "../models/Household";
import { IDevice } from "../models/Device";
import { CustomError } from "../middleware/error.middleware";
import logger from "../utils/logger";
import { Types } from "mongoose";

// Helper function to check if a user is a member of a household
const isUserInHousehold = async (
  userId: Types.ObjectId,
  householdId: Types.ObjectId,
): Promise<boolean> => {
  const household = await Household.findOne({
    _id: householdId,
    members: userId,
  });
  return !!household;
};

// Create a new device
export const createDevice = async (
  name: string,
  type: string,
  householdId: string,
  ownerId: string,
  data?: Record<string, unknown>,
): Promise<IDevice> => {
  const householdObjectId = new Types.ObjectId(householdId);
  const ownerObjectId = new Types.ObjectId(ownerId);

  // Senior Insight: Authorization check - ensure the owner is a member of the household
  const isAuthorized = await isUserInHousehold(
    ownerObjectId,
    householdObjectId,
  );
  if (!isAuthorized) {
    throw new CustomError(
      "User is not a member of the specified household.",
      403,
    );
  }

  const device = new Device({
    name,
    type,
    household: householdObjectId,
    owner: ownerObjectId,
    data: data || {},
  });

  await device.save();
  logger.info(
    `New device '${device.name}' (${device.type}) created in household ${householdId}.`,
  );
  return device;
};

// Get all devices for a specific household
export const getDevicesByHousehold = async (
  householdId: string,
  userId: string,
): Promise<IDevice[]> => {
  const householdObjectId = new Types.ObjectId(householdId);
  const userObjectId = new Types.ObjectId(userId);

  // Senior Insight: Multi-tenancy enforcement.
  const isAuthorized = await isUserInHousehold(userObjectId, householdObjectId);
  if (!isAuthorized) {
    throw new CustomError(
      "User does not have access to this household's devices.",
      403,
    );
  }

  const devices = await Device.find({ household: householdObjectId });
  logger.info(
    `Fetched ${devices.length} devices for household ${householdId}.`,
  );
  return devices;
};

// Get a single device by ID
export const getDeviceById = async (
  deviceId: string,
  userId: string,
): Promise<IDevice> => {
  const device = await Device.findById(deviceId); // Populate household name for context
  if (!device) {
    throw new CustomError("Device not found.", 404);
  }

  // Senior Insight: Multi-tenancy check.
  const userObjectId = new Types.ObjectId(userId);
  const isAuthorized = await isUserInHousehold(userObjectId, device.household);
  if (!isAuthorized) {
    throw new CustomError("User does not have access to this device.", 403);
  }

  logger.info(`Fetched device '${device.name}' for user ${userId}.`);
  return device;
};

// Update a device
export const updateDevice = async (
  deviceId: string,
  userId: string,
  updateData: Partial<IDevice>,
): Promise<IDevice> => {
  const device = await Device.findById(deviceId);
  if (!device) {
    throw new CustomError("Device not found.", 404);
  }

  // Senior Insight: Multi-tenancy check before update.
  const userObjectId = new Types.ObjectId(userId);
  const isAuthorized = await isUserInHousehold(userObjectId, device.household);
  if (!isAuthorized) {
    throw new CustomError(
      "User does not have permission to update this device.",
      403,
    );
  }

  // Senior Insight: Restrict fields that can be updated.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { household, owner, ...safeUpdateData } = updateData;
  const updatedDevice = await Device.findOneAndUpdate(
    { _id: deviceId },
    { $set: safeUpdateData },
    { new: true, runValidators: true },
  );

  if (!updatedDevice) {
    throw new CustomError("Failed to update device.", 500);
  }

  logger.info(`Device '${updatedDevice.name}' updated by user ${userId}.`);
  return updatedDevice;
};

// Delete a device
export const deleteDevice = async (
  deviceId: string,
  userId: string,
): Promise<void> => {
  const device = await Device.findById(deviceId);
  if (!device) {
    throw new CustomError("Device not found.", 404);
  }

  // Senior Insight: Multi-tenancy check before deletion.
  const userObjectId = new Types.ObjectId(userId);
  const isAuthorized = await isUserInHousehold(userObjectId, device.household);
  if (!isAuthorized) {
    throw new CustomError(
      "User does not have permission to delete this device.",
      403,
    );
  }

  const result = await Device.deleteOne({ _id: deviceId });
  if (result.deletedCount === 0) {
    throw new CustomError("Device not found or failed to delete.", 500);
  }

  logger.info(`Device '${device.name}' deleted by user ${userId}.`);
};
