# Smart Home Automation API

## 🏠 Project Overview

This is the backend API for a smart home automation system. It is built using Node.js, Express, and TypeScript, with a MongoDB database. The API provides a secure and scalable foundation for managing users, households, devices, and a multi-tenant invitation system.

## ✨ Key Features

- **Authentication & Authorization:** Secure user registration, login, and token-based access control.
- **Multi-Tenancy:** Robust data isolation ensuring users only access resources (households, devices) they have permission for.
- **Device Management:** A flexible API for creating, updating, and controlling smart home devices.
- **Household Management:** An invitation-based system for adding and managing household members.
- **Data Integrity:** Cascading deletions and atomic transactions to prevent orphaned data.
- **Scalable Architecture:** A service-oriented design that separates concerns and is easy to maintain.

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
    MONGO_URI=mongodb://mongodb:27017/smart-home-db
    JWT_SECRET= # Your JWT secret key
    REFRESH_SECRET= # Your JWT refresh secret key
    ACCESS_TOKEN_EXPIRY=1h
    REFRESH_TOKEN_EXPIRY=7d
    LOG_LEVEL=debug
    ```
    (Note: `JWT_SECRET` and `REFRESH_SECRET` should be long, random strings for production.)

### Running the Project

The project is configured to run using Docker Compose, which will spin up both the Node.js API and a MongoDB instance.

1.  **Build and run the containers:**
    ```bash
    docker-compose up --build
    ```
    This command will build the Docker images and start the services. The API will be available at `http://localhost:3000`.

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

## 🧪 Testing

### Running Tests

To run the unit and integration tests, use the following command:

```bash
npm test
```

## 🤝 Contribution & Collaboration

We welcome contributions! Please follow these steps to contribute:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Commit your changes (`git commit -m 'feat: Add new feature'`).
4.  Push to the branch (`git push origin feature/your-feature`).
5.  Open a Pull Request.

-----

*Built with ❤️ by a senior engineer.*