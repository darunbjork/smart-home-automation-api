/* eslint-disable no-undef */
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ["**/?(*.)+(spec|test).[tj]s?(x)"],
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
  globalSetup: './test/setup.js',
  globalTeardown: './test/teardown.js',
};
