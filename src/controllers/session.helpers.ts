import { CookieOptions, Request, Response } from "express";
import { env } from "../config/env";
import { IssuedRefreshToken, parseDurationMs } from "../services/auth.service";

export const REFRESH_COOKIE = "hearth_rt";

export const isMobileClient = (req: Request): boolean =>
  req.header("x-client") === "mobile";

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.IS_PROD || env.COOKIE_SAMESITE === "none",
  sameSite: env.COOKIE_SAMESITE,
  path: "/users", // only sent to /users/refresh and /users/logout
  ...(env.COOKIE_DOMAIN !== "" ? { domain: env.COOKIE_DOMAIN } : {}),
});

// Web: cookie only. Mobile: body only. Never both.
export const attachRefreshToken = (
  req: Request,
  res: Response,
  refresh: IssuedRefreshToken,
): { refreshToken?: string } => {
  if (isMobileClient(req)) return { refreshToken: refresh.token };
  res.cookie(REFRESH_COOKIE, refresh.token, {
    ...cookieOptions(),
    maxAge: parseDurationMs(env.REFRESH_TOKEN_EXPIRES_IN),
  });
  return {};
};

export const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
};

// Where the presented refresh secret lives:
// mobile = "Authorization: Refresh <token>", web = cookie.
export const readRefreshToken = (req: Request): string | null => {
  if (isMobileClient(req)) {
    const header = req.header("authorization");
    if (header?.startsWith("Refresh ")) {
      return header.slice("Refresh ".length).trim() || null;
    }
    return null;
  }
  const cookie: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof cookie === "string" && cookie.length > 0 ? cookie : null;
};
