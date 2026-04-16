// src/config/env.ts
import { config as load } from "dotenv-flow";
load({ silent: true });

const isTest = process.env.NODE_ENV === "test";

const testDefaults: Record<string, string> = {
  PORT: "0",
  LOG_LEVEL: "fatal",
  MONGO_URI: "mongodb://localhost:27017/smarthome-test",
  JWT_SECRET: "test-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
  ACCESS_TOKEN_EXPIRES_IN: "1h",
  REFRESH_TOKEN_EXPIRES_IN: "7d",
  FRONTEND_URL: "http://localhost:5173",
};

function requireEnv(name: string): string {
  const val = process.env[name] ?? (isTest ? testDefaults[name] : undefined);
  if (val == null || val === "") {
    if (!isTest) throw new Error(`Environment variable ${name} is not set.`);
    return "";
  }
  return val;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? (isTest ? "test" : "development"),
  PORT: parseInt(requireEnv("PORT") || "0", 10),
  LOG_LEVEL: requireEnv("LOG_LEVEL"),
  MONGO_URI: requireEnv("MONGO_URI"),
  JWT_SECRET: requireEnv("JWT_SECRET"),
  JWT_REFRESH_SECRET: requireEnv("JWT_REFRESH_SECRET"),
  ACCESS_TOKEN_EXPIRES_IN: requireEnv("ACCESS_TOKEN_EXPIRES_IN"),
  REFRESH_TOKEN_EXPIRES_IN: requireEnv("REFRESH_TOKEN_EXPIRES_IN"),
  FRONTEND_URL: requireEnv("FRONTEND_URL"),  // ✅ add this line
} as const;