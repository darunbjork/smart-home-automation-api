import http from "http";
import { Server as SocketIoServer } from "socket.io";
import { env } from "./config/env";
import logger from "./utils/logger";
import connectDB from "./config/db";
import { initializeSocketIo } from "./realtime/socket";
import { initializeMqttBroker } from "./services/mqtt.service";
import app from "./app";

const PORT = env.PORT;

(async () => {
  await connectDB(); 

  const server = http.createServer(app);

  const io = new SocketIoServer(server, {
  cors: {
    origin: env.NODE_ENV === "development"
      ? ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5500"]
      : process.env.FRONTEND_URL || "https://yourdomain.com",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

  initializeSocketIo(io);
  initializeMqttBroker(); // Start the MQTT broker

  server.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error({ promise, reason }, "Unhandled Rejection at:");
    server.close(() => {
      process.exit(1);
    });
  });
})();