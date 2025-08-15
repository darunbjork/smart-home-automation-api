<!-- smart-home-automation-api/docs/day-5.md -->

# Week 1, Day 5 — Scalable Service Design: Smart Home Device Management and Multi-Tenancy

## 🎯 Learning Objective Achieved

Today, we focused on **Pillar 5: Scalable Service Design** by implementing a complete **Smart Home Device Management system**. This involved designing a `Device` model and a dedicated `deviceService` to handle its lifecycle (CRUD operations). The key challenge tackled was **multi-tenancy**, ensuring that a user can only manage devices that belong to a household they are a part of. We leveraged the authentication and authorization middleware built on Day 4 to enforce these access controls.

## 🔗 Frontend Developer Connection

The endpoints built (`/devices`, `/devices/:id`) will be the primary source of truth for the user's dashboard. Frontend components (`DeviceList`, `DeviceCard`, `DeviceControl`) can now:

*   **Fetch a list of all devices** for the currently logged-in user's household.
*   **Display a single device's status** and properties.
*   **Send commands to update a device**, like turning a light on or off.
*   **Delete a device** from the household.

The multi-tenancy logic ensures the frontend doesn't need to worry about unauthorized device access, as the backend handles security and data filtering automatically.

## 💡 Design Decisions & Tradeoffs

1.  **Separate `Device` Model and Service:** Maintained **separation of concerns** (Pillar 1) for cleaner, more testable, and scalable code.
2.  **Referential Integrity and Multi-Tenancy:** The `Device` model references its `household` via `householdId`, forming the cornerstone of our **multi-tenancy** approach (Pillar 5). This centralizes access control logic.
3.  **Flexible `Device` Schema:** Included `name`, `type`, `status`, and a `data` field of type `Schema.Types.Mixed` to support diverse smart home devices without constant schema changes. This trades some Mongoose-level type-safety for extensibility.
4.  **Ownership and Permissions:** Both `owner` and `member` roles within a household can manage devices, reflecting real-world usage.

## ✅ Functionality Demonstration

By the end of today, we demonstrated:

1.  A new `Device` model and dedicated `deviceService` with full CRUD operations.
2.  An authenticated and authorized user (owner or member) can **create a new device** for their household.
3.  The same user can **fetch all devices** belonging to their household.
4.  The same user can **fetch a single device** by ID, but only if it belongs to their household.
5.  The same user can **update a device** (e.g., change its name or status).
6.  The same user can **delete a device**.
7.  A user **cannot** access or manage devices that do not belong to their household.

## 🏗️ Step-by-step Implementation (Overview)

1.  Created `src/models/Device.ts` to define the device schema.
2.  Created `src/services/device.service.ts` for multi-tenancy business logic and CRUD operations.
3.  Updated `src/models/Household.ts` to reference devices.
4.  Updated `src/middleware/validation.middleware.ts` with device input validation rules.
5.  Created `src/controllers/device.controller.ts` to expose device service logic to the API.
6.  Created `src/routes/device.routes.ts` to define and protect new device endpoints.
7.  Integrated new device routes and Swagger documentation into `src/app.ts`.

## 🧪 Testing Strategy & Coverage

*   **Unit Tests for `device.service.ts`**: Covered CRUD functions for success and failure, especially multi-tenancy checks.
*   **Integration Tests for `device.routes.ts`**: Used `supertest` to verify endpoint behavior, including authentication, authorization, and validation.

## 📊 Performance & Scaling Analysis

*   **Multi-Tenancy Performance**: The `isUserInHousehold` check adds a single, efficient database query per device request, a reasonable trade-off for security. Caching could further reduce load for high-traffic scenarios.
*   **Device Model Efficiency**: Indexes on `household` and `owner` ensure efficient queries.
*   **`Schema.Types.Mixed` Performance**: Provides flexibility but shifts some validation responsibility to the API layer.

## 🗂️ Git Commit Summary

```bash
git add .
git commit -m "feat(devices): Implement Device model with multi-tenancy support"
git commit -m "feat(devices): Create device service with full CRUD and multi-tenancy checks"
git commit -m "feat(devices): Add device controller and routes protected by auth middleware"
git commit -m "feat(devices): Add validation middleware for device endpoints"
git commit -m "refactor(models): Update Household model to reference devices"
git commit -m "docs(swagger): Add OpenAPI documentation for device management endpoints"
```

## 🐳 Docker & Deployment Status

Our containerized application now fully supports a core business function, providing a consistent, isolated environment for development and testing.

## 🐛 Debugging & Problem Solving

Common issues encountered and resolved:

*   `User not authenticated` (401 Unauthorized): Missing or invalid `Authorization` header.
*   `User does not have access to this device` (403 Forbidden): Multi-tenancy logic correctly rejecting unauthorized requests.
*   Mongoose validation errors: Invalid input data (e.g., `householdId` format).
*   TypeScript compilation errors: Resolved syntax and type-related issues in `validation.middleware.ts`, `device.controller.ts`, and `device.service.ts`.

## 📈 Tomorrow's Growth Plan

Tomorrow, we will expand on this foundation by implementing **Household and User Management**, including:

*   Creating a `Household` service and controller.
*   Building endpoints for `owner` to **invite users** to a household.
*   Implementing logic for `member` to **accept or decline invitations**.
*   Allowing users to **leave a household**.

## 🧠 Senior Engineering Lessons

Today, I learned the critical importance of designing with **multi-tenancy** in mind from the beginning. I saw how:

*   **Data Isolation is not optional; it's a core security requirement.** The `isUserInHousehold` check is crucial for preventing unauthorized data access.
*   **A well-structured service layer facilitates complex logic.** It allows for clean handling of multi-tenancy checks, keeping controllers lean.
*   **Flexible Schemas are a trade-off.** `Schema.Types.Mixed` offers extensibility but requires careful API-level validation.
*   **The API contract is paramount.** Clear endpoints and Swagger documentation are essential for usability and safety.

## 🎉 Confidence Boost

I am extremely confident now! I've built a full-fledged, multi-tenant API for managing devices, complete with authentication and authorization. It feels like I've moved from building a simple user system to creating a genuine, scalable product foundation.

## 📚 Knowledge Gaps Identified

*   Further understanding of `Schema.Types.Mixed` and rigorous runtime validation.
*   Detailed implementation of the invitation flow for household management.
*   Future exploration of real-time smart home systems (e.g., WebSockets for device status updates).
