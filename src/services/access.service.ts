import { Types } from "mongoose";
import Household, { IHousehold } from "../models/Household";
import { CustomError } from "../middleware/error.middleware";

export type HouseholdRole = "owner" | "member";

export interface Membership {
  household: IHousehold;
  role: HouseholdRole;
}

export const getMembership = async (
  userId: string,
  householdId: string,
): Promise<Membership> => {
  if (!Types.ObjectId.isValid(householdId)) {
    throw new CustomError("Household not found.", 404);
  }
  const household = await Household.findById(householdId);
  if (!household) throw new CustomError("Household not found.", 404);

  const uid = new Types.ObjectId(userId);
  const memberIdOf = (
    member: Types.ObjectId | { _id: Types.ObjectId },
  ): Types.ObjectId => (member instanceof Types.ObjectId ? member : member._id);

  if (household.owner.equals(uid)) return { household, role: "owner" };
  if (household.members.some((member) => memberIdOf(member).equals(uid))) {
    return { household, role: "member" };
  }

  // 404, not 403: an outsider must not be able to probe which household ids exist.
  throw new CustomError("Household not found.", 404);
};

export const requireRole = async (
  userId: string,
  householdId: string,
  role: HouseholdRole,
): Promise<Membership> => {
  const membership = await getMembership(userId, householdId);
  if (role === "owner" && membership.role !== "owner") {
    throw new CustomError(
      "Only the household owner can do that.",
      403,
      "FORBIDDEN",
    );
  }
  return membership;
};

// Ids of every household the user belongs to (owner or member).
// Used by sockets and by the profile endpoint.
export const listHouseholdIdsForUser = async (
  userId: string,
): Promise<string[]> => {
  const uid = new Types.ObjectId(userId);
  const households = await Household.find(
    { $or: [{ owner: uid }, { members: uid }] },
    "_id",
  ).lean();
  return households.map((h) => h._id.toString());
};
