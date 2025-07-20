# Project Journal - Commit 2

This journal tracks key decisions, challenges, and solutions during the development of the Smart Home Automation API.

## 2025-07-20 - Second Commit

- **Issue:** `npm install` for `mongodb-memory-server` failed due to missing `tslib`.
  - **Resolution:** Installed `tslib` first, then successfully installed `mongodb-memory-server`.

- **Issue:** `npm run dev` failing with `getaddrinfo ENOTFOUND mongodb`.
  - **Cause:** Node.js application running locally couldn't resolve `mongodb` hostname, which is only valid within Docker network.
  - **Resolution:** Reverted `MONGODB_URI` in `.env` to `mongodb://mongodb:27017/smarthome` and instructed to run the Node.js application via `docker-compose up --build` instead of `npm run dev`.

- **Issue:** `mongo: command not found` in `mongo-init-replica` container logs.
  - **Cause:** The `mongo:6.0` image for `mongo-init-replica` did not include the `mongo` shell client.
  - **Resolution:** Changed `mongo-init-replica` service to use the `mongo` image (which includes the shell) and updated `init-mongo.sh` to use `mongosh` instead of `mongo`.
