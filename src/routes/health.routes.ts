// smart-home-automation-api/src/routes/health.routes.ts
import { Router, Request, Response } from "express";

const router = Router();

/**
 * @darun-portfolio/apps/api/dist/config/swagger.js
 * /health:
 * get:
 * summary: Checks the health of the API
 * tags: [Health]
 * responses:
 * 200:
 * description: API is healthy and running
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * status:
 * type: string
 * example: "UP"
 * timestamp:
 * type: string
 * format: date-time
 * example: "2025-07-13T09:00:00Z"
 * message:
 * type: string
 * example: "Smart Home Automation API is healthy"
 */
router.get("/health", (req: Request, res: Response) => {
  // A senior engineer considers what information is useful for health checks.
  // Beyond just a 200 OK, providing status, timestamp, and a message can be very helpful
  // for monitoring systems and debugging.
  res.status(200).json({
    status: "UP",
    timestamp: new Date().toISOString(),
    message: "Smart Home Automation API is healthy",
  });
});

export default router;
