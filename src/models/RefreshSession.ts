import { Schema, model, Types, Document } from "mongoose";

export interface IRefreshSession extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

const RefreshSessionSchema = new Schema<IRefreshSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    familyId: { type: String, required: true, index: true },
    // Only the SHA-256 of the token is stored: a database leak does not hand
    // anyone a usable refresh token.
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Mongo deletes the document when expiresAt passes (expireAfterSeconds: 0).
RefreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshSession = model<IRefreshSession>(
  "RefreshSession",
  RefreshSessionSchema,
);
export default RefreshSession;
