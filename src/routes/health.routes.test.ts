// smart-home-automation-api/src/routes/health.routes.test.ts
import request from "supertest";
import app from "../app"; // Import our Express app

describe("Health Routes", () => {
  it("should return 200 OK for the health check endpoint", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "UP",
        message: "Smart Home Automation API is healthy",
        timestamp: expect.any(String), // Timestamp will vary, so we check for any string
      }),
    );
  });
});
