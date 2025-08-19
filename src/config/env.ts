// smart-home-automation-api/src/config/env.ts
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

interface EnvConfig {
  LOG_LEVEL: string;
  PORT: number;
  NODE_ENV: string;
  MONGO_URI: string;
  JWT_SECRET: string; // Added JWT_SECRET
  JWT_REFRESH_SECRET: string; // Added JWT_REFRESH_SECRET
  ACCESS_TOKEN_EXPIRES_IN: string; // Added ACCESS_TOKEN_EXPIRES_IN
  REFRESH_TOKEN_EXPIRES_IN: string; // Added REFRESH_TOKEN_EXPIRES_IN
}

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Senior Insight: Use a more specific error for critical env vars like secrets.
    if (name.includes("SECRET")) {
      throw new Error(
        `CRITICAL: Environment variable ${name} is not set. This is a security risk.`,
      );
    }
    throw new Error(`Environment variable ${name} is not set.`);
  }
  return value;
}

export const env: EnvConfig = {
  PORT: parseInt(getEnv("PORT") || "3000", 10),
  NODE_ENV: getEnv("NODE_ENV") || "development",
  MONGO_URI: getEnv("MONGO_URI"),
  JWT_SECRET: getEnv("JWT_SECRET"),
  JWT_REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET"),
  ACCESS_TOKEN_EXPIRES_IN: getEnv("ACCESS_TOKEN_EXPIRES_IN"),
  REFRESH_TOKEN_EXPIRES_IN: getEnv("REFRESH_TOKEN_EXPIRES_IN"),
  LOG_LEVEL: "",
};

if (env.NODE_ENV === "development") {
  console.log("Loaded Environment Variables (sensitive redacted):");
  console.log(`  PORT: ${env.PORT}`);
  console.log(`  NODE_ENV: ${env.NODE_ENV}`);
  console.log(
    `  MONGODB_URI: ${env.MONGO_URI.replace(/:(\\ |\/)?([^ @:]+:[^ @:]*)? @/, ":$1<redacted> @")}`,
  );
  console.log(`  ACCESS_TOKEN_EXPIRES_IN: ${env.ACCESS_TOKEN_EXPIRES_IN}`);
  console.log(`  REFRESH_TOKEN_EXPIRES_IN: ${env.REFRESH_TOKEN_EXPIRES_IN}`);
  console.log(`  JWT_SECRET: ${env.JWT_SECRET ? "<redacted>" : "NOT SET!"}`); // Redact secrets
  console.log(
    `  JWT_REFRESH_SECRET: ${env.JWT_REFRESH_SECRET ? "<redacted>" : "NOT SET!"}`,
  ); // Redact secrets
}
