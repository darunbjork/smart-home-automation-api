import { config as load } from "dotenv-flow";
load({ silent: true });

const isTest = process.env.NODE_ENV === "test";
const isProd = process.env.NODE_ENV === "production";

const testDefaults: Record<string, string> = {
  PORT: "0",
  LOG_LEVEL: "fatal",
  MONGO_URI: "mongodb://localhost:27017/smarthome-test",
  JWT_SECRET: "test-secret-test-secret-test-secret-123",
  ACCESS_TOKEN_EXPIRES_IN: "15m",
  REFRESH_TOKEN_EXPIRES_IN: "30d",
  CORS_ORIGINS: "http://localhost:5173",
};

const requireEnv = (name: string): string => {
  const value = process.env[name] ?? (isTest ? testDefaults[name] : undefined);
  if (value === undefined || value === "") {
    if (isTest) return "";
    throw new Error(`Environment variable ${name} is not set.`);
  }
  return value;
};

const optionalEnv = (name: string, fallback: string): string => {
  const value = process.env[name] ?? (isTest ? testDefaults[name] : undefined);
  return value === undefined || value === "" ? fallback : value;
};

const bool = (name: string, fallback: boolean): boolean => {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
};

const int = (name: string, fallback: number): number => {
  const parsed = Number.parseInt(optionalEnv(name, String(fallback)), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

type SameSite = "lax" | "strict" | "none";
const sameSite = (value: string): SameSite => {
  if (value === "lax" || value === "strict" || value === "none") return value;
  throw new Error(
    `COOKIE_SAMESITE must be lax, strict or none (got "${value}").`,
  );
};

const jwtSecret = requireEnv("JWT_SECRET");
if (isProd && jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters in production.");
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? (isTest ? "test" : "development"),
  IS_PROD: isProd,
  PORT: Number.parseInt(requireEnv("PORT") || "0", 10),
  LOG_LEVEL: optionalEnv("LOG_LEVEL", "info"),
  MONGO_URI: requireEnv("MONGO_URI"),
  JWT_SECRET: jwtSecret,
  ACCESS_TOKEN_EXPIRES_IN: optionalEnv("ACCESS_TOKEN_EXPIRES_IN", "15m"),
  REFRESH_TOKEN_EXPIRES_IN: optionalEnv("REFRESH_TOKEN_EXPIRES_IN", "30d"),
  // Comma-separated exact origins, e.g. "https://app.example.com,http://localhost:5173". No wildcards.
  CORS_ORIGINS: requireEnv("CORS_ORIGINS")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  // Same-site deployment (app.example.com + api.example.com) => "lax".
  // Only use "none" if truly cross-site (breaks in Safari).
  COOKIE_SAMESITE: sameSite(optionalEnv("COOKIE_SAMESITE", "lax")),
  COOKIE_DOMAIN: optionalEnv("COOKIE_DOMAIN", ""), // e.g. ".example.com"; empty = host-only cookie
  TRUST_PROXY_HOPS: int("TRUST_PROXY_HOPS", 1), // Render = 1
  DEFAULT_DEVICE_SIMULATED: bool("DEFAULT_DEVICE_SIMULATED", true),
  DEVICE_ACK_TIMEOUT_MS: int("DEVICE_ACK_TIMEOUT_MS", 10_000),
  AI_ENABLED: bool("AI_ENABLED", false),
  GEMINI_API_KEY: optionalEnv("GEMINI_API_KEY", ""),
  GEMINI_MODEL: optionalEnv("GEMINI_MODEL", ""), // set from Google's current model list; deliberately no default
  MQTT_USERNAME: optionalEnv("MQTT_USERNAME", ""),
  MQTT_PASSWORD: optionalEnv("MQTT_PASSWORD", ""),
  MQTT_BIND_HOST: optionalEnv("MQTT_BIND_HOST", "127.0.0.1"),
  WEBHOOK_URL: optionalEnv("WEBHOOK_URL", ""),
  WEBHOOK_SECRET: optionalEnv("WEBHOOK_SECRET", ""),
  // Empty = Sentry disabled (tests, local dev). Set on Render to enable.
  SENTRY_DSN: optionalEnv("SENTRY_DSN", ""),
} as const;

if (isProd && env.CORS_ORIGINS.length === 0) {
  throw new Error("CORS_ORIGINS must list at least one origin in production.");
}
