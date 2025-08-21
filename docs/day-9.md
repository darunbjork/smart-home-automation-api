# Day 9: Session Summary - Real-Time & IoT Integration with Issue Resolution

This document summarizes the implementation of real-time communication (WebSockets) and IoT integration (MQTT) in the Smart Home Automation API, along with the various challenges encountered and their solutions.

## 1. Real-Time Communication (WebSockets)

**Objective:** Integrate WebSockets to enable real-time device status updates to connected clients.

**Implementation:**
*   Installed `socket.io` and its type definitions.
*   Modified `src/server.ts` to create an HTTP server, attach the Express app, and then attach `socket.io` to the HTTP server.
*   Created `src/realtime/socket.ts` to encapsulate WebSocket logic, including:
    *   Authentication middleware using JWT to secure WebSocket connections.
    *   Joining user sockets to household-specific "rooms" for multi-tenancy.
    *   `emitToHousehold` helper function to broadcast events to specific households.
*   Updated `src/services/device.service.ts` to emit `device:new` and `device:update` events via WebSockets whenever a device is created or updated.

**Issues Faced & Solutions:**

*   **TypeScript/ESLint Errors (`no-explicit-any`, `no-unused-vars`, logger arguments):**
    *   **Problem:** Initial implementation led to `any` type usage, unused import warnings, and incorrect logger function calls (e.g., `logger.error('message', error)` instead of `logger.error({ error }, 'message')`).
    *   **Solution:**
        *   Defined `AuthenticatedSocket` interface to provide type safety for the `socket.user` property, replacing `any` casts.
        *   Removed unused imports (`User`, `IDevice` in `socket.ts` initially, `env` in `mqtt.service.ts`).
        *   Corrected logger calls across `src/services/mqtt.service.ts` and `src/server.ts` to use the object-based `pino` logging format, improving log structure and resolving type errors.
        *   Ran `npm run lint:fix` to automatically resolve Prettier formatting issues.

*   **CORS Policy Blocking WebSocket Connection:**
    *   **Problem:** `client.html` (served from `http://127.0.0.1:5500`) was blocked from connecting to the `socket.io` server (`http://localhost:3000`) due to CORS policy.
    *   **Solution:** Modified `src/server.ts` to allow `http://127.0.0.1:5500` as an allowed origin in the `socket.io` CORS configuration during development.

## 2. IoT Integration (MQTT)

**Objective:** Connect the API to an MQTT broker to send commands to and receive status updates from physical IoT devices.

**Implementation:**
*   Installed `aedes` (embedded MQTT broker) and `mqtt` (client library).
*   Created `src/services/mqtt.service.ts` to manage MQTT logic, including:
    *   Initializing and running an `aedes` broker on port 1883.
    *   Initializing an internal `mqtt` client to connect to the local broker.
    *   Subscribing to device status topics (`smarthome/household/+/device/+/status`).
    *   Handling incoming MQTT messages to update device status in the database and trigger WebSocket events.
    *   `publishCommand` function to send commands to devices via MQTT.
*   Updated `src/server.ts` to initialize the `aedes` MQTT broker on server startup.
*   Modified `src/services/device.service.ts`:
    *   The `updateDevice` function now publishes an MQTT command to the device's command topic.
    *   The device's status is immediately set to `pending` in the database and pushed via WebSocket, awaiting confirmation from the physical device.

**Issues Faced & Solutions:**

*   **`aedes` TypeScript Import/Instantiation Errors:**
    *   **Problem:** Initial attempts to import `aedes` types and instantiate the broker led to `TS2694` and `TS2348` errors.
    *   **Solution:** Corrected the import to `import Aedes, { Client } from 'aedes';` and instantiation to `aedesBroker = new Aedes();`, following `aedes`'s standard TypeScript usage.

*   **`IDevice` `data` Type Incompatibility:**
    *   **Problem:** The `data` field in `IDevice` was `Schema.Types.Mixed`, causing a type mismatch when passed to `publishCommand` (which expected `Record<string, unknown>`).
    *   **Solution:** Updated `IDevice` interface in `src/models/Device.ts` to `data: Record<string, unknown>;` to provide better type specificity while retaining `Schema.Types.Mixed` in the Mongoose schema.
    *   Further refined `publishCommand` in `src/services/mqtt.service.ts` to accept `Partial<Record<string, unknown>>` for the command payload, ensuring type compatibility without requiring explicit casting.

*   **`status: 'pending'` Validation Error:**
    *   **Problem:** Setting a device's status to `pending` during command publishing resulted in a Mongoose validation error because `pending` was not an allowed enum value in the `Device` schema.
    *   **Solution:** Modified `src/models/Device.ts` to add `"pending"` to the `status` enum in both the `IDevice` interface and the `DeviceSchema`.

*   **MQTT Subscription Topic Mismatch:**
    *   **Problem:** The API's internal MQTT client was subscribing to `household/+/devices/+/status`, but the `mqtt-device-simulator.js` was publishing to `smarthome/household/.../device/.../status`.
    *   **Solution:** Corrected the subscription topic in `src/services/mqtt.service.ts` to `smarthome/household/+/device/+/status` to match the expected topic structure.

*   **`mqtt-device-simulator.js` ID Mismatch:**
    *   **Problem:** During testing, the simulator often used outdated `householdId` and `deviceId` values, leading to it not receiving commands or publishing to the correct topics.
    *   **Solution:** Manually updated the `HOUSEHOLD_ID` and `DEVICE_ID` constants within `mqtt-device-simulator.js` to reflect the IDs of the currently active user and device.

## Conclusion

Through this session, the Smart Home Automation API has evolved significantly, gaining real-time capabilities and direct communication with IoT devices. This involved not only implementing new features but also systematically identifying and resolving various technical challenges related to TypeScript, ESLint, CORS, and MQTT protocol specifics. The result is a more robust and functional backend ready for further development.
