import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { env } from "../config/env";
import { IUser } from "../types/user.d";
import User from "../models/User";
import RefreshSession from "../models/RefreshSession";
import { CustomError } from "../middleware/error.middleware";
import logger from "../utils/logger";

// The access token carries ONLY the user id. Per-household roles are
// resolved from the households collection (see access.service.ts).
export interface JwtPayload {
  userId: string;
  exp?: number;
  iat?: number;
}

export interface IssuedRefreshToken {
  token: string;
  familyId: string;
  expiresAt: Date;
}

// Concurrent refreshes with the same token (two tabs, a retry after a
// timeout) inside this window get a 401 but do NOT burn the session family.
const REFRESH_GRACE_MS = 10_000;

export const parseDurationMs = (value: string): number => {
  const amount = Number.parseInt(value.slice(0, -1), 10);
  const unit = value.slice(-1);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid duration "${value}".`);
  }
  switch (unit) {
    case "s":
      return amount * 1_000;
    case "m":
      return amount * 60_000;
    case "h":
      return amount * 3_600_000;
    case "d":
      return amount * 86_400_000;
    default:
      throw new Error(
        `Invalid duration unit in "${value}" (use s, m, h or d).`,
      );
  }
};

const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

export const generateAccessToken = (user: IUser): string => {
  const payload: JwtPayload = { userId: user._id.toHexString() };
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    if (typeof decoded === "string" || typeof decoded.userId !== "string") {
      throw new CustomError("Invalid access token", 401);
    }
    return { userId: decoded.userId, exp: decoded.exp, iat: decoded.iat };
  } catch (err: unknown) {
    if (err instanceof CustomError) throw err;
    if (err instanceof Error && err.name === "TokenExpiredError") {
      throw new CustomError("Access token expired", 401, "TOKEN_EXPIRED");
    }
    throw new CustomError("Invalid access token", 401);
  }
};

// A refresh token is an opaque random string (48 bytes, base64url).
// Only its SHA-256 is stored. No JWT and no second signing secret.
export const issueRefreshToken = async (
  userId: Types.ObjectId,
  familyId: string = crypto.randomUUID(),
): Promise<IssuedRefreshToken> => {
  const token = crypto.randomBytes(48).toString("base64url");
  const expiresAt = new Date(
    Date.now() + parseDurationMs(env.REFRESH_TOKEN_EXPIRES_IN),
  );
  await RefreshSession.create({
    userId,
    familyId,
    tokenHash: hashToken(token),
    expiresAt,
    usedAt: null,
  });
  return { token, familyId, expiresAt };
};

export interface RotationResult {
  accessToken: string;
  refresh: IssuedRefreshToken;
  user: IUser;
}

export const rotateRefreshToken = async (
  presented: string,
): Promise<RotationResult> => {
  const tokenHash = hashToken(presented);
  const now = new Date();

  // Atomic claim: exactly one request can flip usedAt from null.
  // Duplicates fall into the branch below.
  const claimed = await RefreshSession.findOneAndUpdate(
    { tokenHash, usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
    { new: true },
  );

  if (!claimed) {
    const existing = await RefreshSession.findOne({ tokenHash });
    if (
      existing?.usedAt &&
      now.getTime() - existing.usedAt.getTime() > REFRESH_GRACE_MS
    ) {
      // Replay of an already-rotated token outside the grace window:
      // treat the whole family as compromised.
      await RefreshSession.deleteMany({ familyId: existing.familyId });
      logger.warn(
        {
          userId: existing.userId.toString(),
          familyId: existing.familyId,
        },
        "Refresh token reuse detected; session family revoked.",
      );
    }
    throw new CustomError(
      "Invalid or expired refresh token.",
      401,
      "REFRESH_INVALID",
    );
  }

  const user = await User.findOne({ _id: claimed.userId, isActive: true });
  if (!user) {
    await RefreshSession.deleteMany({ familyId: claimed.familyId });
    throw new CustomError(
      "Invalid or expired refresh token.",
      401,
      "REFRESH_INVALID",
    );
  }

  const refresh = await issueRefreshToken(user._id, claimed.familyId);
  return { accessToken: generateAccessToken(user), refresh, user };
};

export const revokeFamilyByToken = async (presented: string): Promise<void> => {
  const session = await RefreshSession.findOne({
    tokenHash: hashToken(presented),
  });
  if (session) await RefreshSession.deleteMany({ familyId: session.familyId });
};

export const revokeAllSessionsForUser = async (
  userId: Types.ObjectId,
): Promise<void> => {
  await RefreshSession.deleteMany({ userId });
};
