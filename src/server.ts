import http from "http";
import { Server as SocketIoServer } from "socket.io";
import cors from "cors";
import { env } from "./config/env";
import { corsOriginCallback } from "./config/cors";
import { captureException, initSentry } from "./config/sentry";
import logger from "./utils/logger";
import connectDB from "./config/db";
import { initializeSocketIo } from "./realtime/socket";
import { parseDurationMs } from "./services/auth.service";
import { initializeMqttBroker } from "./services/mqtt.service";
import app from "./app";

const PORT = env.PORT;

initSentry();

(async () => {
  await connectDB();

  const server = http.createServer(app);

  const io = new SocketIoServer(server, {
    // Browsers are not trusted by cookies here: the handshake carries an
    // Authorization header with a short-lived access token.
    cors: { origin: corsOriginCallback, credentials: false },
    // The old default (300s) let a stale access token keep a socket open
    // for five minutes past expiry.
    pingTimeout: parseDurationMs(env.ACCESS_TOKEN_EXPIRES_IN) + 5_000,
  });
  // socket.io only applies the cors() middleware to the polling transport;
  // attach it to the engine so WebSocket upgrades are covered too.
  io.engine.use(cors({ origin: corsOriginCallback, credentials: false }));

  initializeSocketIo(io);
  initializeMqttBroker();

  server.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });

  const shutdown = (signal: string): void => {
    logger.info({ signal }, "Shutdown signal received.");
    server.close(() => {
      io.close();
      process.exit(0);
    });
    // Failsafe: never hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason, promise) => {
    logger.error({ promise, reason }, "Unhandled rejection.");
    captureException(reason, { kind: "unhandledRejection" });
  });

  process.on("uncaughtException", (error) => {
    logger.fatal({ err: error }, "Uncaught exception.");
    captureException(error, { kind: "uncaughtException" });
    server.close(() => process.exit(1));
    setTimeout(() => process.exit(1), 5_000).unref();
  });
})();
