// smart-home-automation-api/src/types/user.d.ts
import { Document, Types } from "mongoose";

export interface IHousehold extends Document {
  _id: Types.ObjectId;
  name: string;
  owner: Types.ObjectId;
  members: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  __v?: number; // Added for Mongoose version key
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  password?: string;
  households: (Types.ObjectId | IHousehold)[];
  role: "owner" | "member";
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean; // NEW: For soft deletion

  comparePassword(candidatePassword: string): Promise<boolean>;
}
