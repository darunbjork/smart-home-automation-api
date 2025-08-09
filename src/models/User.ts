// smart-home-automation-api/src/models/User.ts
import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs"; // For password hashing
import { IUser } from "../types/user.d"; // Import our interface

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters long"],
      maxlength: [30, "Username cannot exceed 30 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, "Please use a valid email address"], // Basic email regex validation
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      // In a real app, we'd add more complex regex for password strength
    },
    households: [
      {
        type: Schema.Types.ObjectId,
        ref: "Household", // Array of references to Household models
      },
    ],
    role: {
      type: String,
      enum: ["owner", "member"], // Enforces specific values
      default: "member", // Default role for new users
      required: true,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  },
);

// --- Mongoose Pre-save Hook for Password Hashing (Pillar 2: Security Infrastructure) ---
// Senior insight: Use Mongoose middleware (hooks) for operations that should always happen
// before (pre) or after (post) certain document actions (save, remove, findOneAndUpdate, etc.).
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    // Only hash the password if it has been modified (or is new)
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10); // Generate a salt with 10 rounds
    this.password = await bcrypt.hash(this.password!, salt); // Hash the password
    next();
  } catch (error) {
    next(error as Error); // Pass any error to the next middleware
  }
});

// --- Instance Method to Compare Passwords ---
// Senior insight: Add methods directly to the Mongoose schema for actions
// related to a specific document instance, like password comparison.
UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  // `this.password` is the hashed password stored in the database
  // `candidatePassword` is the plain text password provided by the user
  return bcrypt.compare(candidatePassword, this.password!);
};

// Senior insight: Add indexes for frequently queried fields to improve performance.

const User = model<IUser>("User", UserSchema);

export default User;
