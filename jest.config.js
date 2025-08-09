/** @type {import('ts-jest').JestConfigWithTsJest} */
export const preset = 'ts-jest';
export const testEnvironment = 'node';
export const testMatch = ["**/?(*.)+(spec|test).[tj]s?(x)"];
export const collectCoverage = true;
export const coverageDirectory = "coverage";
export const coveragePathIgnorePatterns = [
  "/node_modules/",
  "/src/config/", // Configuration files don't usually need test coverage
  "/src/server.ts", // Server entry file
  "/src/app.ts", // App setup, tested via integration tests of routes
  "/dist/"
];
export const verbose = true;