// smart-home-automation-api/jest.config.js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ["**/?(*.)+(spec|test).[tj]s?(x)"], // Look for test files ending with .spec.ts or .test.ts
  collectCoverage: true, // Collect code coverage information
  coverageDirectory: "coverage", // Output coverage reports to this directory
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/src/config/", // Configuration files don't usually need test coverage
    "/src/server.ts", // Server entry file
    "/src/app.ts", // App setup, tested via integration tests of routes
    "/dist/"
  ],
  verbose: true, // Display individual test results with the test suite hierarchy.
};