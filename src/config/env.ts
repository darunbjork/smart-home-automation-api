// smart-home-automation-api/src/config/env.ts
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file based on NODE_ENV
// In a production setup, these would typically be injected by the orchestrator (e.g., Docker Swarm, Kubernetes)
// or a secret management service. For development, .env is convenient.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  // Add other environment variables as they are introduced
  // Example: MONGODB_URI: string;
  // JWT_SECRET: string;
}

// Ensure all required environment variables are set
function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    // A senior engineer knows that critical configuration must be present
    // and throws explicit errors if missing.
    throw new Error(`Environment variable ${name} is not set.`);
  }
  return value;
}

export const env: EnvConfig = {
  PORT: parseInt(getEnv("PORT") || "3000", 10), // Default to 3000 if not set, but getEnv will throw
  NODE_ENV: getEnv("NODE_ENV") || "development", // Default to development
};

// Log loaded environment variables (only in development, for security)
if (env.NODE_ENV === "development") {
  console.log("Loaded Environment Variables:");
  console.log(`  PORT: ${env.PORT}`);
  console.log(`  NODE_ENV: ${env.NODE_ENV}`);
  // Be careful not to log sensitive variables in production
}
