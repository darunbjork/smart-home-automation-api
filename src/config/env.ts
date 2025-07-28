// smart-home-automation-api/src/config/env.ts
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  mongoURI: string; // Added mongoURI
  JWT_SECRET?: string; // Will add later
  JWT_REFRESH_SECRET?: string; // Will add later
}

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set.`);
  }
  return value;
}

export const env: EnvConfig = {
  PORT: parseInt(getEnv('PORT') || '3000', 10),
  NODE_ENV: getEnv('NODE_ENV') || 'development',
  mongoURI: getEnv('mongoURI'), // Now required
};

if (env.NODE_ENV === 'development') {
  console.log('Loaded Environment Variables:');
  console.log(`  PORT: ${env.PORT}`);
  console.log(`  NODE_ENV: ${env.NODE_ENV}`);
  console.log(`  mongoURI (from process.env): ${process.env.mongoURI}`); // Added for debugging
  console.log(`  mongoURI: ${env.mongoURI.replace(/:(\/?)([^ @:]+:[^@:]*)?@/, ':$1<redacted> @')}`); // Redact sensitive parts for logs
}

// Senior insight: This structured approach to environment variables makes the application
// more robust and easier to debug. It centralizes configuration and ensures that
// the application fails fast if essential variables are missing.
