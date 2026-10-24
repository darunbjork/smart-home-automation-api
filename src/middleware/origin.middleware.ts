import { RequestHandler } from "express";
import { env } from "../config/env";
import { CustomError } from "./error.middleware";

// Cookie-authenticated POSTs must come from one of our own origins.
// Requests without Origin (mobile app, curl, server-to-server) are fine:
// they cannot carry the browser cookie anyway and must present the refresh
// token explicitly.
export const requireTrustedOrigin: RequestHandler = (req, _res, next) => {
  const origin = req.headers.origin;
  if (origin !== undefined && !env.CORS_ORIGINS.includes(origin)) {
    next(new CustomError("Origin not allowed.", 403, "CORS_FORBIDDEN"));
    return;
  }
  next();
};
