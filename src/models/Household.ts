// smart-home-automation-api/src/models/Household.ts
import { Schema, model } from "mongoose";
import { IHousehold } from "../types/user.d"; // Import our interface

const HouseholdSchema = new Schema<IHousehold>(
  {
    name: {
      type: String,
      required: [true, "Household name is required"],
      trim: true,
      minlength: [3, "Household name must be at least 3 characters long"],
      maxlength: [50, "Household name cannot exceed 50 characters"],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User", // Array of references to User models
      },
    ],
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  },
);

// Senior insight: Add indexes for frequently queried fields to improve performance.
HouseholdSchema.index({ owner: 1, name: 1 }, { unique: true }); // Ensure unique name per owner

const Household = model<IHousehold>("Household", HouseholdSchema);

export default Household;
