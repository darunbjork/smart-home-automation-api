// smart-home-automation-api/src/models/Household.ts
import { Schema, model, Document, Types } from "mongoose";
import { IUser } from "../types/user.d";
import { IDevice } from "./Device"; // NEW: Import Device interface

// Update the interface to include devices
export interface IHousehold extends Document {
  _id: Types.ObjectId;
  name: string;
  owner: Types.ObjectId;
  members: Types.ObjectId[] | IUser[];
  devices: Types.ObjectId[] | IDevice[]; // NEW: An array of devices
  createdAt: Date;
  updatedAt: Date;
}

const HouseholdSchema = new Schema<IHousehold>(
  {
    name: {
      type: String,
      required: [true, "Household name is required"],
      unique: true,
      trim: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Household must have an owner"],
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    devices: [
      // NEW: Add devices array
      {
        type: Schema.Types.ObjectId,
        ref: "Device",
      },
    ],
  },
  {
    timestamps: true,
  },
);

const Household = model<IHousehold>("Household", HouseholdSchema);

export default Household;
