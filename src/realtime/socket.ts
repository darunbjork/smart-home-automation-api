// smart-home-automation-api/src/realtime/socket.ts
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { env } from "../config/env";
import logger from "../utils/logger";
import User from "../models/User";
import { IDevice } from "../models/Device";

interface AuthenticatedSocket extends Socket {
  user: {
    userId: Types.ObjectId;
    email: string;
    households: string[];
  };
}

let io: Server;

export const initializeSocketIo = (socketIoInstance: Server) => {
  io = socketIoInstance;

  // Middleware to authenticate WebSocket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: Token not provided."));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        userId: string;
        role: string;
      };
      const user = await User.findById(decoded.userId).lean();
      if (!user) {
        return next(new Error("Authentication error: User not found."));
      }

      // Senior Insight: Attach user data to the socket for later use
      (socket as AuthenticatedSocket).user = {
        userId: user._id,
        email: user.email,
        households: user.households.map((id) => id.toString()),
      };

      next();
    } catch (error) {
      logger.error({ err: error }, "Socket authentication failed");
      next(new Error("Authentication error: Invalid token."));
    }
  });

  io.on("connection", async (socket) => {
    const user = (socket as AuthenticatedSocket).user;
    logger.info(`User connected via socket: ${user.email}`);

    // Senior Insight: Join the user to rooms for each of their households
    user.households.forEach((householdId: string) => {
      socket.join(householdId);
      logger.debug(`User ${user.email} joined household room: ${householdId}`);
    });

    socket.on("disconnect", () => {
      logger.info(`User disconnected via socket: ${user.email}`);
    });
  });
};

/**
 * Emits a real-time event to all members of a specific household.
 * @param eventName The name of the event (e.g., 'device:update').
 * @param householdId The ID of the household room to broadcast to.
 * @param data The payload to send with the event.
 */
export const emitToHousehold = (
  eventName: string,
  householdId: Types.ObjectId,
  data: IDevice,
) => {
  if (!io) {
    logger.error("Socket.io not initialized.");
    return;
  }
  // Senior Insight: Use the io.to() method to broadcast to a specific room
  io.to(householdId.toString()).emit(eventName, data);
  logger.debug(`Event '${eventName}' emitted to household ${householdId}`);
};
