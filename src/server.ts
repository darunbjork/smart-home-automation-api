// smart-home-automation-api/src/server.ts
import http from "http";
import { Server as SocketIoServer } from "socket.io";
import { env } from "./config/env";
import logger from "./utils/logger";
import connectDB from "./config/db";
import { initializeSocketIo } from "./realtime/socket";
import { initializeMqttBroker } from './services/mqtt.service'; // NEW: Import MQTT broker init

const PORT = env.PORT;

await connectDB(); // Await the connection

import app from "./app"; // app is imported here after DB connection

const server = http.createServer(app);
  cors: {
    origin:
      env.NODE_ENV === "development"
        ? ["http://localhost:3000", "http://127.0.0.1:5500"]
        : "YOUR_FRONTEND_DOMAIN",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

initializeSocketIo(io);
initializeMqttBroker(); // NEW: Start the MQTT broker

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ promise, reason }, "Unhandled Rejection at:");
  server.close(() => {
    process.exit(1);
  });
});
