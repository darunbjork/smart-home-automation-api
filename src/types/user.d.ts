// smart-home-automation-api/src/types/user.d.ts
import { Document, Types } from "mongoose";

// Define the interface for a Household document
export interface IHousehold extends Document {
  _id: Types.ObjectId; // MongoDB ObjectId
  name: string;
  owner: Types.ObjectId; // Reference to the User who owns this household
  members: Types.ObjectId[]; // Array of references to User documents
  createdAt: Date;
  updatedAt: Date;
}

// Define the interface for a User document
export interface IUser extends Document {
  _id: Types.ObjectId; // MongoDB ObjectId
  username: string;
  email: string;
  password?: string; // Optional because it won't be retrieved with user data generally
  households: Types.ObjectId[]; // Array of references to Household documents
  role: "owner" | "member"; // Basic role management
  createdAt: Date;
  updatedAt: Date;

  // Method to compare passwords (added in model definition later)
  comparePassword(candidatePassword: string): Promise<boolean>;
}
