// smart-home-automation-api/src/models/Device.ts
import { Schema, model, Document, Types } from "mongoose";

// Define the interface for the Device document
export interface IDevice extends Document {
  _id: Types.ObjectId;
  name: string;
  type: string; // e.g., 'light', 'thermostat', 'sensor'
  status: "online" | "offline" | "unknown" | "pending";
  household: Types.ObjectId; // A reference to the household it belongs to
  owner: Types.ObjectId; // A reference to the user who initially created it
  data: Record<string, unknown>; // Flexible field to store device-specific data
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema<IDevice>(
  {
    name: {
      type: String,
      required: [true, "Device name is required"],
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Device type is required"],
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ["online", "offline", "unknown", "pending"],
      default: "unknown",
    },
    household: {
      type: Schema.Types.ObjectId,
      ref: "Household",
      required: [true, "Device must belong to a household"],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Device must have an owner"],
    },
    data: {
      type: Schema.Types.Mixed,
      required: false,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// Senior Insight: Indexing household and owner for efficient queries.
DeviceSchema.index({ household: 1 });
DeviceSchema.index({ owner: 1 });

const Device = model<IDevice>("Device", DeviceSchema);

export default Device;
