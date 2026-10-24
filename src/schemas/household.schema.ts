import { z } from "zod";
import { objectIdSchema } from "./common.schema";

export const updateHouseholdSchema = z.strictObject({
  name: z.string().trim().min(1).max(60),
});
export type UpdateHouseholdInput = z.infer<typeof updateHouseholdSchema>;

// The email is lowercased and trimmed before it reaches the service,
// so the stored lookup key matches the User model's lowercase email.
export const inviteHouseholdSchema = z.strictObject({
  householdId: objectIdSchema,
  inviteeEmail: z.string().trim().toLowerCase().email().max(254),
});
export type InviteHouseholdInput = z.infer<typeof inviteHouseholdSchema>;

export const invitationTokenSchema = z.strictObject({
  token: z.string().trim().min(1).max(128),
});

export const leaveHouseholdSchema = z.strictObject({
  householdId: objectIdSchema,
});
