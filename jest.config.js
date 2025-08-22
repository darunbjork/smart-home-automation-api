/* eslint-disable no-undef */
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.spec.ts"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/src/config/", // Configuration files don't usually need test coverage
    "/src/server.ts", // Server entry file
    "/src/app.ts", // App setup, tested via integration tests of routes
    "/dist/"
  ],
  verbose: true,
  globalSetup: './test/setup.ts',
  globalTeardown: './test/teardown.ts',
};