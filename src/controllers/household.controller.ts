// smart-home-automation-api/src/controllers/household.controller.ts
import { Request, Response, NextFunction } from "express";
import * as householdService from "../services/household.service";
import { CustomError } from "../middleware/error.middleware";
import logger from "../utils/logger";
import { IHousehold } from "../models/Household";
import { IUser } from "../types/user";

// Helper function to prepare household response
const prepareHouseholdResponse = (household: IHousehold) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { __v: _, ...householdResponse } = household.toObject({
    getters: true,
  });
  // Clean up member and owner details
  householdResponse.owner = householdResponse.owner
    ? householdResponse.owner._id
    : householdResponse.owner;
  householdResponse.members = householdResponse.members
    ? householdResponse.members.map((m: IUser) => m._id)
    : householdResponse.members;
  return householdResponse;
};

// Get all households for the authenticated user
export const getHouseholds = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new CustomError("User not authenticated.", 401);
    }
    const households = await householdService.getHouseholdsForUser(userId);
    res
      .status(200)
      .json({ households: households.map(prepareHouseholdResponse) });
  } catch (error) {
    logger.error({ error }, "Error fetching households.");
    next(error);
  }
};

// Get a single household by ID
export const getHouseholdById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new CustomError("User not authenticated.", 401);
    }
    const household = await householdService.getHouseholdById(
      req.params.id,
      userId,
    );
    res.status(200).json({ household: prepareHouseholdResponse(household) });
  } catch (error) {
    logger.error({ error }, `Error fetching household ${req.params.id}.`);
    next(error);
  }
};

// Delete a household (requires owner role)
export const deleteHousehold = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new CustomError("User not authenticated.", 401);
    }
    await householdService.deleteHousehold(req.params.id, userId);
    res.status(200).json({
      message: "Household and all associated data deleted successfully.",
    });
  } catch (error) {
    logger.error({ error }, `Error deleting household ${req.params.id}.`);
    next(error);
  }
};

// Invite a user to a household (requires owner role)
export const inviteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { householdId, inviteeEmail } = req.body;
    const inviterId = req.user?.userId;
    if (!inviterId) {
      throw new CustomError("User not authenticated.", 401);
    }
    const invitation = await householdService.inviteUserToHousehold(
      householdId,
      inviterId,
      inviteeEmail,
    );
    res
      .status(201)
      .json({ message: `Invitation sent to ${inviteeEmail}.`, invitation });
  } catch (error) {
    logger.error(
      { error },
      `Error inviting user to household ${req.body.householdId}.`,
    );
    next(error);
  }
};

// Get pending invitations for the user
export const getInvitations = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new CustomError("User not authenticated.", 401);
    }
    const invitations = await householdService.getInvitationsForUser(userId);
    res.status(200).json({ invitations });
  } catch (error) {
    logger.error({ error }, "Error fetching invitations.");
    next(error);
  }
};

// Accept an invitation
export const acceptInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.body;
    const userId = req.user?.userId;
    if (!userId) {
      throw new CustomError("User not authenticated.", 401);
    }
    const household = await householdService.acceptInvitation(token, userId);
    res.status(200).json({
      message: "Invitation accepted successfully.",
      household: prepareHouseholdResponse(household),
    });
  } catch (error) {
    logger.error(
      { error },
      `Error accepting invitation with token ${req.body.token}.`,
    );
    next(error);
  }
};

// Decline an invitation
export const declineInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.body;
    const userId = req.user?.userId;
    if (!userId) {
      throw new CustomError("User not authenticated.", 401);
    }
    await householdService.declineInvitation(token, userId);
    res.status(200).json({ message: "Invitation declined successfully." });
  } catch (error) {
    logger.error(
      { error },
      `Error declining invitation with token ${req.body.token}.`,
    );
    next(error);
  }
};

// Leave a household
export const leaveHousehold = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { householdId } = req.body;
    const userId = req.user?.userId;
    if (!userId) {
      throw new CustomError("User not authenticated.", 401);
    }
    await householdService.leaveHousehold(householdId, userId);
    res.status(200).json({ message: "Successfully left the household." });
  } catch (error) {
    logger.error({ error }, `Error leaving household ${req.body.householdId}.`);
    next(error);
  }
};
