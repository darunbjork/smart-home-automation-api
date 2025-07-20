# Smart Home Automation API

This repository contains the backend API for a Smart Home Automation system. It is built with Node.js, Express, and TypeScript, and is designed to be scalable, secure, and easy to maintain.

## Prerequisites

Before you begin, ensure you have the following installed on your local machine:

- [Node.js](https://nodejs.org/) (v20.x or later recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Docker](https://www.docker.com/products/docker-desktop/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

There are two ways to run this project: locally for development or using Docker.

### 1. Local Development

This is the recommended approach for active development, as it provides hot-reloading.

**1.1. Clone the repository:**

```bash
git clone <your-repository-url>
cd smart-home-automation-api
```

**1.2. Install dependencies:**

```bash
npm install
```

**1.3. Set up environment variables:**

Create a `.env` file in the root of the project and add the following variables:

```
PORT=3000
NODE_ENV=development
```

**1.4. Run the development server:**

This command starts the server with `nodemon`, which will automatically restart the application when file changes are detected.

```bash
npm run dev
```

The API will be running at `http://localhost:3000`.

### 2. Running with Docker

This method is ideal for simulating a production environment or for running the application without installing Node.js locally.

**2.1. Build and start the containers:**

Ensure Docker Desktop is running, then run the following command from the project root:

```bash
docker-compose up --build
```

This command will build the Docker image and start the API container. The API will be accessible at `http://localhost:3000`.

To stop the containers, press `Ctrl+C` and then run:

```bash
docker-compose down
```

## Available Scripts

- `npm start`: Starts the application in production mode (requires a prior build).
- `npm run build`: Compiles the TypeScript code to JavaScript in the `dist/` directory.
- `npm run dev`: Runs the application in development mode with hot-reloading.
- `npm test`: Runs the test suite using Jest.
- `npm run lint`: Lints the codebase for potential errors.
- `npm run lint:fix`: Lints the codebase and automatically fixes issues.

## API Endpoints

### Health Check

- **GET /health**
  - **Description:** Checks the health of the API.
  - **Success Response:**
    - **Code:** 200 OK
    - **Content:** `{"status":"UP","timestamp":"...","message":"Smart Home Automation API is healthy"}`
