import request from "supertest";
import app from "../src/app";

describe("security baseline", () => {
  it("does not advertise x-powered-by", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("sets trust proxy so rate limiting keys on the real client IP", () => {
    const settings = (app as unknown as { settings: Record<string, unknown> })
      .settings;
    expect(settings["trust proxy"]).toBe(1);
  });

  it("rejects an origin that is not in CORS_ORIGINS", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "https://evil.example");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("CORS_FORBIDDEN");
  });

  it("allows a configured origin", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:5173");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
  });

  it("rejects JSON bodies larger than 100kb with 413", async () => {
    const res = await request(app)
      .post("/users/login")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ email: "a@b.com", padding: "x".repeat(150_000) }));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
    expect(res.body.error.stack).toBeUndefined();
  });

  it("strips Mongo operators from the body (no operator injection)", async () => {
    const res = await request(app)
      .post("/users/login")
      .send({ email: { $gt: "" }, password: "irrelevant" });
    // express-mongo-sanitize empties the operator key, then validation fails.
    expect([400, 422]).toContain(res.status);
    expect(res.status).not.toBe(200);
    expect(res.status).not.toBe(401);
  });

  it("serves /api-docs outside production", async () => {
    const res = await request(app).get("/api-docs/");
    expect(res.status).toBe(200);
  });
});
