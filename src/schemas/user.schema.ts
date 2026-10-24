import { z } from "zod";

// Self-service profile update: ONLY the username can change here.
// role, isActive, households and password are rejected (422) by strictObject.
export const updateUserSchema = z.strictObject({
  username: z.string().trim().min(3).max(30).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
