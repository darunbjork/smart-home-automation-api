import express, { Application, NextFunction, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import swaggerUi from "swagger-ui-express";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import healthRoutes from "./routes/health.routes";
import userRoutes from "./routes/user.routes";
import deviceRoutes from "./routes/device.routes";
import householdRoutes from "./routes/household.routes";
import aiRoutes from "./routes/ai.routes";
import swaggerSpec from "./config/swagger";
import { env } from "./config/env";
import { corsOriginCallback } from "./config/cors";
import logger from "./utils/logger";
import { CustomError, errorHandler } from "./middleware/error.middleware";
import { globalLimiter } from "./middleware/rate-limit.middleware";

const app: Application = express();

// Render terminates TLS and forwards via one proxy. Without this, req.ip is the proxy for everyone.
app.set("trust proxy", env.TRUST_PROXY_HOPS);
app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const existing = req.headers["x-request-id"];
      const id =
        typeof existing === "string" && existing.length <= 64
          ? existing
          : randomUUID();
      res.setHeader("x-request-id", id);
      return id;
    },
    // Never log credentials.
    redact: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
    ],
    autoLogging: {
      ignore: (req) => req.url === "/health" || req.url === "/ready",
    },
  }),
);

app.use(helmet());

app.use(
  cors({
    origin: corsOriginCallback,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Client",
      "X-Requested-With",
      "X-Request-Id",
    ],
    exposedHeaders: [
      "X-Request-Id",
      "RateLimit",
      "RateLimit-Policy",
      "Retry-After",
    ],
    maxAge: 600,
  }),
);

app.use(globalLimiter);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(cookieParser());
app.use(mongoSanitize()); // strips $ and . keys from body/query/params => blocks NoSQL operator injection

// API docs only outside production.
if (!env.IS_PROD) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

app.use("/", healthRoutes);
app.use("/users", userRoutes);
app.use("/devices", deviceRoutes);
app.use("/households", householdRoutes);
app.use("/ai", aiRoutes);

app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new CustomError("Route not found.", 404, "NOT_FOUND"));
});

app.use(errorHandler);

export default app;
