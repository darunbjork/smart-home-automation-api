// smart-home-automation-api/src/models/RefreshToken.ts
import { Schema, model, Types, Document } from "mongoose";

// Define interface for RefreshToken document
export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId; // Reference to the User who owns this token
  token: string; // The actual refresh token string
  expiresAt: Date; // When the token expires
  createdAt: Date;
  updatedAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true, // Ensure uniqueness for token values
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt
  },
);

// Senior Insight: Add index on `expiresAt` with `expireAfterSeconds` for auto-deletion
// This is a TTL (Time-To-Live) index that automatically removes documents after a certain time.
// Crucial for managing token expiry and preventing database bloat.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = model<IRefreshToken>("RefreshToken", RefreshTokenSchema);

export default RefreshToken;
