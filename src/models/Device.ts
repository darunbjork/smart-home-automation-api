import { Schema, model, Document, Types } from "mongoose";

export interface IDevice extends Document {
  _id: Types.ObjectId;
  name: string;
  type: string; // e.g., 'light', 'thermostat', 'sensor'
  status: "online" | "offline" | "unknown" | "pending";
  household: Types.ObjectId; 
  owner: Types.ObjectId; 
  data: Record<string, unknown>; 
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
