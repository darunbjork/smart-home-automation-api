import { CustomError } from "../middleware/error.middleware";
import { env } from "./env";

type OriginCallback = (err: Error | null, allow?: boolean) => void;

// Shared by Express (app.ts) and Socket.IO (server.ts) so both enforce the
// same allowlist. No Origin header = non-browser client (curl, mobile,
// server-to-server): allowed, but it still needs credentials/tokens.
export const corsOriginCallback = (
  origin: string | undefined,
  callback: OriginCallback,
): void => {
  if (!origin || env.CORS_ORIGINS.includes(origin)) {
    callback(null, true);
    return;
  }
  callback(new CustomError("Origin not allowed.", 403, "CORS_FORBIDDEN"));
};
