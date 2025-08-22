# Smart Home Automation API

## 🏠 Project Overview

This is the backend API for a smart home automation system. It is built using Node.js, Express, and TypeScript, with a MongoDB database. The API provides a secure and scalable foundation for managing users, households, devices, and a multi-tenant invitation system.

## ✨ Key Features

- **Authentication & Authorization:** Secure user registration, login, and token-based access control.
- **Multi-Tenancy:** Robust data isolation ensuring users only access resources (households, devices) they have permission for.
- **Device Management:** A flexible API for creating, updating, and controlling smart home devices.
- **Household Management:** An invitation-based system for adding and managing household members.
- **Data Integrity:** Cascading deletions and atomic transactions to prevent orphaned data.
- **Real-Time Communication (WebSockets):** Instantaneous updates of device statuses and other events to connected clients.
- **IoT Integration (MQTT):** Seamless communication with physical smart home devices for sending commands and receiving status updates.

## 🚀 Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [Node.js](https://nodejs.org/) (v18 or higher)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/YOUR_GITHUB_USERNAME/smart-home-automation-api.git
    cd smart-home-automation-api
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Configure environment variables:**
    Create a `.env` file in the project root with the following content:
    ```ini
    PORT=3000
    NODE_ENV=development
    MONGO_URI=mongodb://localhost:27017/smart-home-db
    JWT_SECRET= # Your JWT secret key
    JWT_REFRESH_SECRET= # Your JWT refresh secret key
    ACCESS_TOKEN_EXPIRES_IN=1h
    REFRESH_TOKEN_EXPIRES_IN=7d
    LOG_LEVEL=debug
    ```
    (Note: `JWT_SECRET` and `JWT_REFRESH_SECRET` should be long, random strings for production.)

### Running the Project

The project is configured to run using Docker Compose, which will spin up the Node.js API, an embedded MQTT broker, and a MongoDB instance.

1.  **Build and run the containers:**
    ```bash
    docker-compose up --build
    ```
    This command will build the Docker images and start the services. The API will be available at `http://localhost:3000`, and the MQTT broker will be accessible on port `1883`.

### Running Locally (without Docker Compose for API)

You can also run the API directly on your machine, connecting to a local or Dockerized MongoDB instance.

1.  **Ensure MongoDB is running:**
    If you're using Docker Compose for MongoDB, start it:
    ```bash
    docker-compose up -d mongo
    ```
2.  **Start the API:**
    ```bash
    npm run start:prod
    ```
    The API will be available at `http://localhost:3000`.

## 🚀 Deployment to AWS

This project is designed for cloud deployment. A detailed guide on how to deploy this application to AWS, including setting up AWS CLI, ECR, and pushing Docker images, can be found in the [AWS Deployment Guide](docs/aws-deployment-guide.md).

## 📚 Project Evolution: A Day-by-Day Journey

### Day 1: Project Initialization & Enterprise Setup
- **Objective:** Set up a production-grade Node.js project with TypeScript, modular structure, essential security middleware, health checks, and Dockerization.
- **Key Activities:** Initialized Node.js project, configured TypeScript, established modular folder structure, implemented environment variable handling, developed health check, set up Express with security middleware and global error handling, implemented server entry point with graceful shutdown, added basic logger, configured Jest for testing, and created initial Docker setup.
- **Outcome:** A fully functional, containerized Node.js application with a solid foundation.

### Day 2: Data Layer Excellence: MongoDB, Mongoose, User & Household Models, and Secure Authentication
- **Objective:** Integrate MongoDB and Mongoose, define data models for Users and Households, and implement secure password hashing.
- **Key Activities:** Updated `docker-compose.yml` with MongoDB service, configured environment variables for MongoDB and JWT, installed Mongoose and bcryptjs, set up database connection logic, integrated database connection into application startup, created Mongoose models for `Household` and `User` (with password hashing), implemented user registration and login logic in services and controllers, and defined custom error middleware.
- **Outcome:** Persistent storage for smart home data, secure user authentication, and basic multi-tenancy.

### Day 3: Challenges Faced and Solutions Implemented
- **Objective:** Address critical issues encountered during development, including MongoDB replica set initialization, inconsistent API error responses, and TypeScript compilation problems.
- **Key Activities:** Implemented robust `docker-compose.yml` configurations with `healthcheck` and `depends_on` to ensure MongoDB readiness, rewrote `init-mongo.sh` for reliable replica set initiation, introduced a `CustomError` class for consistent JSON error responses, corrected global error handling middleware signature, and resolved TypeScript import and type recognition issues.
- **Outcome:** Enhanced stability, improved error handling, and a more reliable development environment.

### Day 4: Security Infrastructure: JWT Authentication with Refresh Token Rotation and Authorization Middleware
- **Objective:** Implement JWT-based authentication with refresh token rotation and robust authentication/authorization middleware.
- **Key Activities:** Integrated `jsonwebtoken` and `cookie-parser`, configured JWT secrets and expiry times, created `RefreshToken` Mongoose model for database storage, developed `auth.service.ts` for token generation, verification, and rotation, implemented `authenticate` and `authorize` middleware for RBAC, and added new user endpoints for token refresh and logout. 
- **Outcome:** Secure, stateless authentication with enhanced user experience and protection of API endpoints.

### Day 5: Scalable Service Design: Smart Home Device Management and Multi-Tenancy
- **Objective:** Implement a complete Smart Home Device Management system with multi-tenancy, ensuring users only manage devices within their households.
- **Key Activities:** Designed `Device` model with flexible schema, created `deviceService` for CRUD operations with multi-tenancy checks, updated `Household` model to reference devices, implemented device input validation, and exposed device management functionality via new controllers and routes protected by authentication and authorization middleware.
- **Outcome:** Full CRUD capabilities for smart home devices with strict multi-tenancy enforcement.

### Day 6: Household and User Management
- **Objective:** Build a comprehensive household and user management system, including an invitation system.
- **Key Activities:** Created `household` service, controller, and routes for household CRUD operations, introduced `Invitation` model for pending invitations, implemented invitation system (invite, accept, decline), enforced RBAC for household administration (owner-only actions), and added cascading deletion logic for data integrity.
- **Outcome:** A collaborative, multi-user application foundation with secure invitation and household management features.

### Day 7: Professionalism and Automation Features
- **Objective:** Enhance the API with features crucial for professional development and automation, including a robust CI/CD pipeline and optimized Docker images.
- **Key Activities:** Integrated Swagger UI for interactive API documentation, refined the logging system to output structured JSON for production readiness, implemented a multi-stage Dockerfile for smaller and more secure production images, and set up a comprehensive CI/CD pipeline using GitHub Actions for automated builds, tests, and Docker image pushes.
- **Outcome:** Improved API usability, maintainability, and automated quality assurance with a production-ready deployment strategy.

### Day 8: Real-Time Systems: Implementing WebSockets for Device Status
- **Objective:** Extend the REST API to support real-time communication using WebSockets.
- **Key Activities:** Integrated `socket.io`, implemented WebSocket authentication, established household-based "rooms", and enabled real-time event emission for device updates.
- **Outcome:** A responsive and interactive smart home application with instant device status updates.

### Day 9: External Integrations: Connecting to the Real World with MQTT
- **Objective:** Connect the Node.js API to an MQTT broker to send commands to and receive status updates from physical IoT devices.
- **Key Activities:** Integrated `aedes` (embedded MQTT broker) and `mqtt` (client library), designed topic structure, implemented command publishing and status update handling, and established a closed-loop system for device control and feedback.
- **Outcome:** A fully functional IoT backend capable of communicating with real-world devices.

## 🧪 Testing

### Running Tests

To run the unit and integration tests, use the following command:

```bash
npm test
```

### API Documentation

The API documentation is automatically generated using Swagger and is available at:

`http://localhost:3000/api-docs`

This interactive UI allows you to explore all endpoints, test them directly, and understand the API's structure.

### MQTT Integration Testing

To test the MQTT integration, you'll need to simulate an IoT device.

1.  **Start the API:** Ensure your Docker containers are running:
    ```bash
    docker-compose up --build
    ```
2.  **Prepare a Device:** Register a user and create a device via the API (e.g., using Postman). Note down the `householdId` and `deviceId`.
3.  **Run the Device Simulator:**
    *   Update `mqtt-device-simulator.js` with your `HOUSEHOLD_ID` and `DEVICE_ID`.
    *   Run the simulator in a new terminal:
        ```bash
        node mqtt-device-simulator.js
        ```
4.  **Send a Command:** Update the device's `data` via the API (e.g., `PATCH /devices/:deviceId`).
    *   **Expected:** The simulator terminal should show it received the command and published a status update.
5.  **Verify Status Update:** Check your `client.html` browser console. You should see a `device:update` event with the device's status changed to `online`.

## 🤝 Contribution & Collaboration

We welcome contributions! Please follow these steps to contribute:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Commit your changes (`git commit -m 'feat: Add new feature'`).
4.  Push to the branch (`git push origin feature/your-feature`).
5.  Open a Pull Request.

-----

*Built with ❤️ by a senior engineer.*
