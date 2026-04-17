import { Request, Response, NextFunction } from "express";
import * as householdService from "../services/household.service";
import { CustomError } from "../middleware/error.middleware";
import logger from "../utils/logger";
import { IHousehold } from "../models/Household";
import { IUser } from "../types/user";
import Household from "../models/Household";


const prepareHouseholdResponse = (household: IHousehold) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { __v: _, ...householdResponse } = household.toObject({
    getters: true,
  });
  householdResponse.owner = householdResponse.owner
    ? householdResponse.owner._id
    : householdResponse.owner;
  householdResponse.members = householdResponse.members
    ? householdResponse.members.map((m: IUser) => m._id)
    : householdResponse.members;
  return householdResponse;
};

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

export const createHousehold = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new CustomError("User not authenticated.", 401);
    
    const { name } = req.body;
    if (!name) throw new CustomError("Household name is required.", 400);
    
    const household = await householdService.createHousehold(name, userId);
    // Return the created household, ensuring it's formatted correctly
    res.status(201).json(prepareHouseholdResponse(household));
  } catch (error) {
    next(error);
  }
};

export const updateHousehold = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const updatedHousehold = await Household.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true } 
    ).populate("members owner"); 
    
    if (!updatedHousehold) throw new CustomError("Household not found", 404);

    res.status(200).json(prepareHouseholdResponse(updatedHousehold));
  } catch (error) {
    if (error instanceof CustomError) {
      next(error);
    } else {
      logger.error({ error }, `Error updating household ${req.params.id}.`);
      next(new CustomError("Failed to update household.", 500));
    }
  }
};
