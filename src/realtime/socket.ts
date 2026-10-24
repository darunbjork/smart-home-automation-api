import { Server, Socket } from "socket.io";
import User from "../models/User";
import logger from "../utils/logger";
import { verifyAccessToken } from "../services/auth.service";
import { listHouseholdIdsForUser } from "../services/access.service";

export type DeviceEvent = "device:new" | "device:update" | "device:deleted";

interface SocketData {
  userId: string;
}

let io: Server | null = null;

const householdRoom = (householdId: string): string =>
  `household:${householdId}`;
const userRoom = (userId: string): string => `user:${userId}`;

export const initializeSocketIo = (instance: Server): void => {
  io = instance;

  io.use(async (socket: Socket, next) => {
    try {
      const token: unknown = socket.handshake.auth?.token;
      if (typeof token !== "string" || token.length === 0) {
        next(new Error("Authentication error: token not provided."));
        return;
      }
      const payload = verifyAccessToken(token);
      const user = await User.findOne(
        { _id: payload.userId, isActive: true },
        "_id",
      ).lean();
      if (!user) {
        next(new Error("Authentication error: user not found."));
        return;
      }
      (socket.data as SocketData).userId = payload.userId;

      // Drop the connection the moment the access token expires. The client
      // refreshes and reconnects with the new token.
      if (payload.exp !== undefined) {
        const timer = setTimeout(
          () => socket.disconnect(true),
          Math.max(0, payload.exp * 1000 - Date.now()),
        );
        socket.once("disconnect", () => clearTimeout(timer));
      }
      next();
    } catch (error) {
      logger.warn({ err: error }, "Socket authentication failed.");
      next(new Error("Authentication error: invalid token."));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const { userId } = socket.data as SocketData;
    await socket.join(userRoom(userId));
    // Membership is read from the households collection, not from a possibly
    // stale user.households array.
    const householdIds = await listHouseholdIdsForUser(userId);
    await Promise.all(householdIds.map((id) => socket.join(householdRoom(id))));
    logger.debug({ userId, rooms: householdIds.length }, "Socket connected.");
    // The server accepts no client events: no socket.on(...) handlers on purpose.
  });
};

export const emitToHousehold = <T>(
  event: DeviceEvent,
  householdId: { toString(): string },
  payload: T,
): void => {
  if (!io) {
    logger.error("Socket.io not initialised; event dropped.");
    return;
  }
  io.to(householdRoom(householdId.toString())).emit(event, payload);
};

// Call when membership changes so live sockets follow the database.
export const addUserToHouseholdRoom = (
  userId: string,
  householdId: string,
): void => {
  io?.in(userRoom(userId)).socketsJoin(householdRoom(householdId));
};

export const removeUserFromHouseholdRoom = (
  userId: string,
  householdId: string,
): void => {
  io?.in(userRoom(userId)).socketsLeave(householdRoom(householdId));
};

export const closeHouseholdRoom = (householdId: string): void => {
  io?.in(householdRoom(householdId)).socketsLeave(householdRoom(householdId));
};
