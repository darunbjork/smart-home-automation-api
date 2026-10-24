import { Types } from "mongoose";
import crypto from "crypto";
import Household, { IHousehold } from "../models/Household";
import User from "../models/User";
import Device from "../models/Device";
import Invitation, { IInvitation } from "../models/Invitation";
import { CustomError } from "../middleware/error.middleware";
import logger from "../utils/logger";
import { getMembership, requireRole } from "./access.service";
import {
  addUserToHouseholdRoom,
  closeHouseholdRoom,
  removeUserFromHouseholdRoom,
} from "../realtime/socket";

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
  // Outsiders get 404 (getMembership), never a 403 that would leak existence.
  const membership = await getMembership(userId, householdId);
  const household = await Household.findById(membership.household._id).populate(
    "members owner",
  );
  if (!household) {
    throw new CustomError("Household not found.", 404);
  }
  return household as IHousehold;
};

export const updateHouseholdName = async (
  userId: string,
  householdId: string,
  name: string,
): Promise<IHousehold> => {
  await requireRole(userId, householdId, "owner");
  const updated = await Household.findByIdAndUpdate(
    householdId,
    { $set: { name } },
    { new: true, runValidators: true },
  );
  if (!updated) throw new CustomError("Household not found.", 404);
  return updated;
};

export const deleteHousehold = async (
  householdId: string,
  userId: string,
): Promise<void> => {
  const { household } = await requireRole(userId, householdId, "owner");
  const householdObjectId = household._id;

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
    closeHouseholdRoom(householdId);
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
): Promise<IInvitation | null> => {
  const { household: membershipHousehold } = await requireRole(
    inviterId,
    householdId,
    "owner",
  );
  const householdObjectId = membershipHousehold._id;
  const inviterObjectId = new Types.ObjectId(inviterId);

  const household = await Household.findById(householdObjectId)
    .populate("members")
    .lean();
  if (!household) {
    throw new CustomError("Household not found.", 404);
  }

  const invitee = await User.findOne({ email: inviteeEmail });
  if (!invitee) {
    // No account enumeration: nothing is created and the route answer is
    // identical to the "invitee exists" case.
    logger.warn(`Invite requested for an unknown email address.`);
    return null;
  }

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
    `Invitation created for household ${householdId} to email ${inviteeEmail}.`,
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
    addUserToHouseholdRoom(userId, household._id.toString());
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
  const userObjectId = new Types.ObjectId(userId);

  // Non-members get 404; owners are not allowed to leave (delete instead).
  const { household, role } = await getMembership(userId, householdId);
  if (role === "owner") {
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
    removeUserFromHouseholdRoom(userId, household._id.toString());
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

export const createHousehold = async (
  name: string,
  userId: string,
): Promise<IHousehold> => {
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

    await User.findByIdAndUpdate(
      userObjectId,
      { $push: { households: household._id } },
      { session },
    );

    await session.commitTransaction();
    logger.info(`Household "${name}" created by user ${userId}.`);
    addUserToHouseholdRoom(userId, household._id.toString());
    return household;
  } catch (error) {
    await session.abortTransaction();
    logger.error({ error }, `Failed to create household "${name}".`);
    throw error;
  } finally {
    session.endSession();
  }
};
