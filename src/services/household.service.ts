// smart-home-automation-api/src/services/household.service.ts
import { Types } from "mongoose";
import crypto from "crypto";
import Household, { IHousehold } from "../models/Household";
import User from "../models/User";
import Device from "../models/Device";
import Invitation, { IInvitation } from "../models/Invitation";
import { CustomError } from "../middleware/error.middleware";
import logger from "../utils/logger";

// Helper function to check if a user is an owner of a household
const isUserOwnerOfHousehold = async (
  userId: Types.ObjectId,
  householdId: Types.ObjectId,
): Promise<boolean> => {
  const household = await Household.findById(householdId).lean();
  if (!household) return false;
  return household.owner.equals(userId);
};

// --- Household CRUD Operations ---

// Get all households for a user
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

// Get a single household by ID
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

// Delete a household (cascading deletion)
export const deleteHousehold = async (
  householdId: string,
  userId: string,
): Promise<void> => {
  const householdObjectId = new Types.ObjectId(householdId);
  const userObjectId = new Types.ObjectId(userId);

  // Senior Insight: Crucial security check. Only the owner can delete the household.
  if (!(await isUserOwnerOfHousehold(userObjectId, householdObjectId))) {
    throw new CustomError(
      "Only the household owner can delete the household.",
      403,
    );
  }

  // Senior Insight: Perform cascading deletion to maintain data integrity.
  const session = await Household.startSession();
  session.startTransaction();
  try {
    // 1. Delete all devices in the household
    await Device.deleteMany({ household: householdObjectId }, { session });

    // 2. Remove household from all members' household list and change role to 'member' if they are an owner and not in another household.
    const household =
      await Household.findById(householdObjectId).session(session);
    if (household) {
      const memberIds = household.members;
      for (const memberId of memberIds) {
        await User.findByIdAndUpdate(
          memberId,
          {
            $pull: { households: householdObjectId },
            // Note: Logic for role change is more complex. For now, we'll leave role untouched.
            // In a more advanced system, if the user becomes an 'owner' of another household,
            // their role would remain 'owner'. If not, they would become 'member' or be deleted.
          },
          { session },
        );
      }
    }

    // 3. Delete all outstanding invitations for this household
    await Invitation.deleteMany({ household: householdObjectId }, { session });

    // 4. Delete the household itself
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
      `Failed to delete household ${householdId} with cascading:`,
      error,
    );
    throw error;
  } finally {
    session.endSession();
  }
};

// --- Invitation Management ---

// Invite a user to a household
export const inviteUserToHousehold = async (
  householdId: string,
  inviterId: string,
  inviteeEmail: string,
): Promise<IInvitation> => {
  const householdObjectId = new Types.ObjectId(householdId);
  const inviterObjectId = new Types.ObjectId(inviterId);

  // Security check: Only the household owner can send invitations.
  if (!(await isUserOwnerOfHousehold(inviterObjectId, householdObjectId))) {
    throw new CustomError("Only the household owner can invite users.", 403);
  }

  const household = await Household.findById(householdObjectId)
    .populate("members")
    .lean();
  if (!household) {
    throw new CustomError("Household not found.", 404);
  }

  // Find the invitee user by email
  const invitee = await User.findOne({ email: inviteeEmail });
  if (!invitee) {
    // Senior Insight: If user doesn't exist, we can still send an invitation.
    // The user will be created upon accepting the invitation.
    logger.warn(`Invitation sent to non-existent user email: ${inviteeEmail}.`);
  } else {
    // Check if the user is already a member
    if (household.members.some((member) => member._id.equals(invitee._id))) {
      throw new CustomError("User is already a member of this household.", 409);
    }
    // Check if there's a pending invitation
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

  const token = crypto.randomBytes(32).toString("hex"); // Generate a secure, random token
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Expires in 24 hours

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

// Get pending invitations for a user
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

// Accept an invitation
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

  // Senior Insight: Use a transaction to ensure atomicity of updates.
  const session = await Household.startSession();
  session.startTransaction();
  try {
    // 1. Add user to the household's members list
    await Household.findByIdAndUpdate(
      household._id,
      { $addToSet: { members: userObjectId } },
      { session },
    );

    // 2. Add the household to the user's household list
    await User.findByIdAndUpdate(
      userObjectId,
      { $addToSet: { households: household._id } },
      { session },
    );

    // 3. Delete the invitation
    await Invitation.deleteOne({ _id: invitation._id }, { session });

    await session.commitTransaction();
    logger.info(
      `User ${userId} accepted invitation to household ${household._id}.`,
    );
    return household;
  } catch (error) {
    await session.abortTransaction();
    logger.error(
      "Failed to accept invitation due to transaction error:",
      error,
    );
    throw error;
  } finally {
    session.endSession();
  }
};

// Decline an invitation
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

// Leave a household
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

  // Security check: Owner cannot leave the household. They must delete it.
  if (household.owner.equals(userObjectId)) {
    throw new CustomError(
      "Owners cannot leave their household; they must delete it instead.",
      403,
    );
  }

  // Senior Insight: Use a transaction for atomic update of both Household and User.
  const session = await Household.startSession();
  session.startTransaction();
  try {
    // 1. Remove user from the household's members list
    await Household.findByIdAndUpdate(
      household._id,
      { $pull: { members: userObjectId } },
      { session },
    );

    // 2. Remove the household from the user's household list
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
      `Failed to leave household ${householdId} due to transaction error:`,
      error,
    );
    throw error;
  } finally {
    session.endSession();
  }
};
