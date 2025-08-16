// smart-home-automation-api/src/models/Invitation.ts
import { Schema, model, Document, Types } from "mongoose";

// Define the interface for the Invitation document
export interface IInvitation extends Document {
  _id: Types.ObjectId;
  household: Types.ObjectId;
  inviter: Types.ObjectId;
  inviteeEmail: string; // We invite by email, not by user ID
  token: string; // A unique token for the invitation
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    household: {
      type: Schema.Types.ObjectId,
      ref: "Household",
      required: true,
    },
    inviter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    inviteeEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Senior Insight: Use a TTL index to automatically clean up expired invitations.
InvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Invitation = model<IInvitation>("Invitation", InvitationSchema);

export default Invitation;
