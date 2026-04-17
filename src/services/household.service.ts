import { Types } from "mongoose";
import crypto from "crypto";
import Household, { IHousehold } from "../models/Household";
import User from "../models/User";
import Device from "../models/Device";
import Invitation, { IInvitation } from "../models/Invitation";
import { CustomError } from "../middleware/error.middleware";
import logger from "../utils/logger";

const isUserOwnerOfHousehold = async (
  userId: Types.ObjectId,
  householdId: Types.ObjectId,
): Promise<boolean> => {
  const household = await Household.findById(householdId).lean();
  if (!household) return false;
  return household.owner.equals(userId);
};

export const getHouseholdsForUser = async (
  userId: string,
): Promise<IHousehold[]> => {
  const userObjectId = new Types.ObjectId(userId);
  const user = await User.findById(userObjectId).populate("households");
  if (!user) {
    throw new CustomError("User not found.", 404);
  }
  return user.households as IHousehold[];
};

export const getHouseholdById = async (
  householdId: string,
  userId: string,
): Promise<IHousehold> => {
  const household =
    await Household.findById(householdId).populate("members owner");
  if (!household) {
    throw new CustomError("Household not found.", 404);
  }
  const userObjectId = new Types.ObjectId(userId);
  if (!household.members.some((member) => member._id.equals(userObjectId))) {
    throw new CustomError("User is not a member of this household.", 403);
  }
  return household as IHousehold;
};

export const deleteHousehold = async (
  householdId: string,
  userId: string,
): Promise<void> => {
  const householdObjectId = new Types.ObjectId(householdId);
  const userObjectId = new Types.ObjectId(userId);

  if (!(await isUserOwnerOfHousehold(userObjectId, householdObjectId))) {
    throw new CustomError(
      "Only the household owner can delete the household.",
      403,
    );
  }

  const session = await Household.startSession();
  session.startTransaction();
  try {
    await Device.deleteMany({ household: householdObjectId }, { session });

    const household =
      await Household.findById(householdObjectId).session(session);
    if (household) {
      const memberIds = household.members;
      for (const memberId of memberIds) {
        await User.findByIdAndUpdate(
          memberId,
          {
            $pull: { households: householdObjectId },
          },
          { session },
        );
      }
    }

    await Invitation.deleteMany({ household: householdObjectId }, { session });

    const result = await Household.deleteOne(
      { _id: householdObjectId },
      { session },
    );
    if (result.deletedCount === 0) {
      throw new CustomError("Household not found or failed to delete.", 404);
    }

    await session.commitTransaction();
    logger.info(
      `Household ${householdId} and all associated data deleted by owner ${userId}.`,
    );
  } catch (error) {
    await session.abortTransaction();
    logger.error(
      { error },
      `Failed to delete household ${householdId} with cascading.`,
    );
    throw error;
  } finally {
    session.endSession();
  }
};

export const inviteUserToHousehold = async (
  householdId: string,
  inviterId: string,
  inviteeEmail: string,
): Promise<IInvitation> => {
  const householdObjectId = new Types.ObjectId(householdId);
  const inviterObjectId = new Types.ObjectId(inviterId);

  if (!(await isUserOwnerOfHousehold(inviterObjectId, householdObjectId))) {
    throw new CustomError("Only the household owner can invite users.", 403);
  }

  const household = await Household.findById(householdObjectId)
    .populate("members")
    .lean();
  if (!household) {
    throw new CustomError("Household not found.", 404);
  }

  const invitee = await User.findOne({ email: inviteeEmail });
  if (!invitee) {
    logger.warn(`Invitation sent to non-existent user email: ${inviteeEmail}.`);
  } else {
    if (household.members.some((member) => member._id.equals(invitee._id))) {
      throw new CustomError("User is already a member of this household.", 409);
    }

    const existingInvitation = await Invitation.findOne({
      household: householdObjectId,
      inviteeEmail,
    });
    if (existingInvitation) {
      throw new CustomError(
        "An invitation for this user is already pending.",
        409,
      );
    }
  }

  const token = crypto.randomBytes(32).toString("hex"); 
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const invitation = new Invitation({
    household: householdObjectId,
    inviter: inviterObjectId,
    inviteeEmail,
    token,
    expiresAt,
  });

  await invitation.save();
  logger.info(
    `Invitation sent for household ${householdId} to email ${inviteeEmail}.`,
  );
  return invitation;
};

export const getInvitationsForUser = async (
  userId: string,
): Promise<IInvitation[]> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new CustomError("User not found.", 404);
  }
  const invitations = await Invitation.find({
    inviteeEmail: user.email,
  }).populate("household", "name");
  return invitations;
};

export const acceptInvitation = async (
  token: string,
  userId: string,
): Promise<IHousehold> => {
  const userObjectId = new Types.ObjectId(userId);
  const user = await User.findById(userObjectId);
  if (!user) {
    throw new CustomError("User not found.", 404);
  }

  const invitation = await Invitation.findOne({
    token,
    inviteeEmail: user.email,
  });
  if (!invitation || invitation.expiresAt < new Date()) {
    throw new CustomError("Invalid or expired invitation token.", 404);
  }

  const household = await Household.findById(invitation.household);
  if (!household) {
    throw new CustomError("Household not found.", 404);
  }

  const session = await Household.startSession();
  session.startTransaction();
  try {
    await Household.findByIdAndUpdate(
      household._id,
      { $addToSet: { members: userObjectId } },
      { session },
    );

    await User.findByIdAndUpdate(
      userObjectId,
      { $addToSet: { households: household._id } },
      { session },
    );

    await Invitation.deleteOne({ _id: invitation._id }, { session });

    await session.commitTransaction();
    logger.info(
      `User ${userId} accepted invitation to household ${household._id}.`,
    );
    return household;
  } catch (error) {
    await session.abortTransaction();
    logger.error(
      { error },
      "Failed to accept invitation due to transaction error.",
    );
    throw error;
  } finally {
    session.endSession();
  }
};

export const declineInvitation = async (
  token: string,
  userId: string,
): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new CustomError("User not found.", 404);
  }

  const invitation = await Invitation.findOne({
    token,
    inviteeEmail: user.email,
  });
  if (!invitation || invitation.expiresAt < new Date()) {
    throw new CustomError("Invalid or expired invitation token.", 404);
  }

  await Invitation.deleteOne({ _id: invitation._id });
  logger.info(
    `User ${userId} declined invitation for household ${invitation.household}.`,
  );
};

export const leaveHousehold = async (
  householdId: string,
  userId: string,
): Promise<void> => {
  const householdObjectId = new Types.ObjectId(householdId);
  const userObjectId = new Types.ObjectId(userId);

  const household = await Household.findById(householdObjectId);
  if (!household) {
    throw new CustomError("Household not found.", 404);
  }

  if (household.owner.equals(userObjectId)) {
    throw new CustomError(
      "Owners cannot leave their household; they must delete it instead.",
      403,
    );
  }

  const session = await Household.startSession();
  session.startTransaction();
  try {
    await Household.findByIdAndUpdate(
      household._id,
      { $pull: { members: userObjectId } },
      { session },
    );

    await User.findByIdAndUpdate(
      userObjectId,
      { $pull: { households: household._id } },
      { session },
    );

    await session.commitTransaction();
    logger.info(`User ${userId} successfully left household ${household._id}.`);
  } catch (error) {
    await session.abortTransaction();
    logger.error(
      { error },
      `Failed to leave household ${householdId} due to transaction error.`,
    );
    throw error;
  } finally {
    session.endSession();
  }
};

export const createHousehold = async (name: string, userId: string): Promise<IHousehold> => {
  const userObjectId = new Types.ObjectId(userId);

  const session = await Household.startSession();
  session.startTransaction();
  try {
    const household = new Household({
      name,
      owner: userObjectId,
      members: [userObjectId],
    });

    await household.save({ session });

    await User.findByIdAndUpdate(userObjectId, { $push: { households: household._id } }, { session });

    await session.commitTransaction();
    logger.info(`Household "${name}" created by user ${userId}.`);
    return household;
  } catch (error) {
    await session.abortTransaction();
    logger.error({ error }, `Failed to create household "${name}".`);
    throw error;
  } finally {
    session.endSession();
  }
};
