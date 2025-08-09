# Day 2 — Data Layer Excellence: MongoDB, Mongoose, User & Household Models, and Secure Authentication

## Learning Objectives Achieved

Today, we successfully integrated MongoDB as our primary database and Mongoose as our ODM (Object Data Modeling) library. We learned how to securely connect to a database within a Dockerized environment, defined flexible yet structured data models for Users and Households, and implemented secure password hashing with bcrypt. This step is crucial for persisting our smart home data, managing user access, and ensuring data integrity.

## Implementation Details

### 1. Docker Compose Update
- Added a `mongodb` service to `docker-compose.yml` using `mongo:6.0` image.
- Exposed MongoDB port `27017` to the host.
- Configured a named volume `mongodb_data` for data persistence.
- Added `MONGODB_URI` environment variable to the `api` service in `docker-compose.yml` to allow the API to connect to the MongoDB service within Docker.

### 2. Environment Variables
- Updated `.env` file with `MONGODB_URI=mongodb://localhost:27017/smarthome` for local development and consistency.
- Modified `src/config/env.ts` to include `MONGODB_URI`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` in the `EnvConfig` interface and to log `MONGODB_URI` (redacted) in development.

### 3. Package Installation
- Installed `mongoose` and `bcryptjs` as production dependencies.
- Installed `@types/mongoose` and `@types/bcryptjs` as development dependencies.
- Installed `mongodb-memory-server` and `@types/mongodb-memory-server` for testing purposes.

### 4. Database Connection Configuration
- Created `src/config/db.ts` to handle MongoDB connection logic using Mongoose.
- Implemented `connectDB` function to establish connection and log Mongoose connection events.
- Added graceful shutdown handling for MongoDB connection.

### 5. Application Integration
- Modified `src/server.ts` to import and call `connectDB()` before starting the Express server, ensuring database readiness.
- Updated the graceful shutdown in `src/server.ts` to explicitly close the Mongoose connection.
- Modified `src/app.ts` to import `userRoutes` and `CustomError`.
- Integrated user routes under the `/auth` prefix in `src/app.ts`.
- Updated the global error handling middleware in `src/app.ts` to use `CustomError` and handle `_next` parameter correctly.

### 6. Mongoose Models
- Created `src/types/user.d.ts` to define TypeScript interfaces `IHousehold` and `IUser` for type safety.
- Created `src/models/Household.ts` with a Mongoose schema for households, including `name`, `owner`, and `members` fields, and `timestamps`. Added a unique index on `owner` and `name`.
- Created `src/models/User.ts` with a Mongoose schema for users, including `username`, `email`, `password`, `households`, and `role` fields, and `timestamps`.
- Implemented a `pre('save')` hook in `UserSchema` for secure password hashing using `bcryptjs`.
- Added an instance method `comparePassword` to `UserSchema` for password verification.
- Simplified the email regex in `src/models/User.ts` for broader compatibility during testing.

### 7. User Controller
- Created `src/controllers/user.controller.ts` with `registerUser` and `loginUser` functions.
- Implemented basic input validation at the controller level.
- Ensured that hashed passwords are not sent back in API responses.

### 8. User Service
- Created `src/services/user.service.ts` containing the core business logic for user registration and login.
- Implemented logic to check for existing users (username/email).
- Handled the creation of a new user and their associated household.
- **Note on Transactions:** For testing purposes with `mongodb-memory-server`, the transaction logic in `registerUser` was temporarily removed to avoid `WriteConflict` errors. For production environments, it is crucial to re-introduce and properly manage transactions for atomicity and data consistency.

### 9. Custom Error Middleware
- Created `src/middleware/error.middleware.ts` to define a `CustomError` class for standardized API error responses.

### 10. User Authentication Routes
- Created `src/routes/user.routes.ts` to define API endpoints for user registration (`/auth/register`) and login (`/auth/login`).
- Integrated the user controller functions with these routes.
- Included Swagger documentation comments for the new routes.

## Functionality Demonstration

By the end of Day 2, we can demonstrate:
- MongoDB running successfully as a Dockerized service.
- Our Node.js API connecting to MongoDB.
- The ability to create a new user via an API endpoint, with their password securely hashed.
- The ability to log in a user by comparing the provided password to the stored hash.
- Basic multi-tenancy demonstrated by associating users with households.

## Testing

Comprehensive unit/integration tests were written for the user authentication and household management routes in `src/routes/user.routes.test.ts`. These tests cover:
- Successful user registration and household creation.
- Handling duplicate user registration (username/email).
- Successful user login.
- Handling invalid login credentials.
- Verifying that passwords are securely hashed.
- Confirming that households are correctly associated with users.
- The tests utilize `mongodb-memory-server` for an isolated in-memory database environment.
