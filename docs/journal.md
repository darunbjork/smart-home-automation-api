# Project Journal

This journal tracks key decisions, challenges, and solutions during the development of the Smart Home Automation API.

## 2025-07-20

- **Issue:** MongoDB transactions failing with "Transaction numbers are only allowed on a replica set member or mongos" error.
  - **Cause:** Local MongoDB instance was running as a standalone server, not a replica set.
  - **Resolution:** Modified `docker-compose.yml` to configure MongoDB as a replica set and added `init-mongo.sh` script to initiate the replica set. Updated `MONGODB_URI` in `.env` to `mongodb://mongodb:27017/smarthome` for Dockerized app, and then back to `mongodb://localhost:27017/smarthome` for local `npm run dev` (with Docker containers running in background).

- **Issue:** `npm test` failing with timeout errors for User model tests.
  - **Cause:** Tests were attempting to connect to a non-existent MongoDB instance.
  - **Resolution:** Installed `mongodb-memory-server` and updated `src/models/User.test.ts` to use an in-memory database for isolated unit testing.

- **Issue:** Type mismatch in `IUser` interface for `households` array.
  - **Cause:** `households` was defined as `Types.ObjectId[] | IHousehold[]`, leading to ambiguity.
  - **Resolution:** Changed `households` type to `Types.ObjectId[]` in `src/types/user.d.ts`. Populating the field with Mongoose will correctly provide `IHousehold` documents when needed.