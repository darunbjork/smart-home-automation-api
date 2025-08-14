# Smart Home Automation API

This repository contains the backend API for the Smart Home Automation System. It is a production-grade Node.js application built with TypeScript, Express, and Docker.

## Table of Contents

- [Progress Log](#progress-log)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Running the Application](#running-the-application)
  - [Development Mode](#development-mode)
  - [Production Mode](#production-mode)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Progress Log

- [**Day 2: Data Layer Excellence**](docs/day-2.md): Integrated MongoDB and Mongoose, defined User and Household models, and implemented secure authentication with bcrypt.
- [**Day 4: Security Infrastructure**](docs/day-4.md): Implemented JWT authentication with refresh token rotation and authorization middleware.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20.x or later)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [Git](https://git-scm.com/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd smart-home-automation-api
    ```

2.  **Create an environment file:**
    Create a `.env` file in the root of the project and add the following variables:
    ```env
    PORT=3000
    NODE_ENV=development
    ```

3.  **Install dependencies:**
    It is recommended to run the application using Docker, which handles dependencies automatically. However, if you need to install dependencies locally:
    ```bash
    npm install
    ```

## Running the Application

### Development Mode

For development, we use Docker Compose to run the application in a container with live-reloading enabled.

```bash
docker-compose up --build
```

The API will be available at `http://localhost:3000`. Any changes to the source code will automatically restart the server.

To run in development mode without Docker:
```bash
npm run dev
```

### Production Mode

To run the application in production mode (using the compiled JavaScript from the `dist` directory):

```bash
npm run build
npm start
```

## Running Tests

To run the test suite:

```bash
npm test
```

To run tests in watch mode:

```bash
npm test:watch
```

To get a coverage report:
```bash
npm test -- --coverage
```

## Project Structure

### API Documentation

API documentation will be generated using Swagger and will be available at the `/api-docs` endpoint in the future. For now, the available endpoints can be found in the `src/routes` directory.

The health check endpoint is available at:
- `GET /health`

## Architecture

This project is built with a focus on scalability, maintainability, and security. Key architectural decisions include:

- **TypeScript:** For type safety and improved developer experience.
- **Modular Structure:** Separation of concerns into layers (controllers, services, models).
- **Express.js:** A flexible and minimalist web framework.
- **Docker Containerization:** For consistent environments and easy deployment.
- **Jest & Supertest:** For unit and integration testing.
- **Security:** Using `helmet`, `cors`, and `express-rate-limit` for baseline security.
- **Graceful Shutdown:** To ensure the server shuts down cleanly.

## Deployment

The application is designed to be deployed using Docker. The `Dockerfile` creates a production-ready image. This image can be deployed to any container orchestration platform like Kubernetes or a cloud service like AWS ECS or Google Cloud Run.

## Contributing

Contributions are welcome! Please follow the standard Git workflow:

1.  Fork the repository.
2.  Create a new feature branch (`git checkout -b feature/your-feature`).
3.  Commit your changes (`git commit -m '''feat: Add some feature'''`).
4.  Push to the branch (`git push origin feature/your-feature`).
5.  Open a pull request.