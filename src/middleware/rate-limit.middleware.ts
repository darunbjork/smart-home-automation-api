import { Request, Response } from "express";
import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { env } from "../config/env";

const skip = (): boolean => env.NODE_ENV === "test";

const handler = (_req: Request, res: Response): void => {
  res.status(429).json({
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests. Please wait a moment and try again.",
    },
  });
};

const ip = (req: Request): string => req.ip ?? "unknown";

const emailFrom = (req: Request): string => {
  const body: unknown = req.body;
  if (typeof body === "object" && body !== null && "email" in body) {
    const email = (body as { email: unknown }).email;
    if (typeof email === "string") {
      return email.trim().toLowerCase().slice(0, 254);
    }
  }
  return "";
};

const base = {
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
  skip,
  handler,
};

// Generous per-IP ceiling for everything (a dashboard with sockets + polling stays far below this).
export const globalLimiter: RateLimitRequestHandler = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 600,
});

// Credential stuffing: bucket by IP + email, only failures count.
export const loginLimiter: RateLimitRequestHandler = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ip(req)}|${emailFrom(req)}`,
});

export const registerLimiter: RateLimitRequestHandler = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 5,
});

export const refreshLimiter: RateLimitRequestHandler = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 60,
});

export const inviteLimiter: RateLimitRequestHandler = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 20,
});

// AI is expensive: per USER (falls back to IP), not per IP.
export const aiLimiter: RateLimitRequestHandler = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.user?.userId ?? ip(req),
});
