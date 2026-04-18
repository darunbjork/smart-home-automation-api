import { Schema, model, Document, Types } from "mongoose";
import { IUser } from "../types/user.d";
import { IDevice } from "./Device"; 
export interface IHousehold extends Document {
  _id: Types.ObjectId;
  name: string;
  owner: Types.ObjectId;
  members: Types.ObjectId[] | IUser[];
  devices: Types.ObjectId[] | IDevice[]; 
  createdAt: Date;
  updatedAt: Date;
}

const HouseholdSchema = new Schema<IHousehold>(
  {
    name: {
      type: String,
      required: [true, "Household name is required"],
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
