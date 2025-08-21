// smart-home-automation-api/src/server.ts
import app from "./app";
import http from "http"; // NEW: Import the http module
import { Server as SocketIoServer } from "socket.io"; // NEW: Import Server class
import { env } from "./config/env";
import logger from "./utils/logger";
import connectDB from "./config/db";
import { initializeSocketIo } from "./realtime/socket"; // NEW: We'll create this file

const PORT = env.PORT;

const server = http.createServer(app); // NEW: Create an HTTP server from the Express app

// Connect to MongoDB
connectDB();

// Initialize socket.io with the HTTP server
const io = new SocketIoServer(server, {
  cors: {
    origin:
      env.NODE_ENV === "development"
        ? ["http://localhost:3000", "http://127.0.0.1:5500"]
        : "YOUR_FRONTEND_DOMAIN",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Pass the io instance to our real-time module
initializeSocketIo(io);

// Start the server
server.listen(PORT, () => {
  // Listen on the HTTP server, not the Express app
  logger.info(`Server is running on port ${PORT}`);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ promise, reason }, "Unhandled Rejection at:");
  server.close(() => {
    process.exit(1);
  });
});
