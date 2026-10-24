import express from "express";
import request from "supertest";
import { z } from "zod";
import app from "../src/app";
import { captureException, isSentryEnabled } from "../src/config/sentry";
import { errorHandler } from "../src/middleware/error.middleware";
import { validateBody } from "../src/middleware/validate.middleware";

describe("error contract", () => {
  it("unknown route returns 404 with the error envelope and no stack", async () => {
    const res = await request(app).get("/definitely-not-a-route");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: "NOT_FOUND", message: "Route not found." },
    });
    expect(res.body.error.stack).toBeUndefined();
  });

  it("invalid body on a route using validateBody returns 422 VALIDATION", async () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.post(
      "/widgets",
      validateBody(z.strictObject({ name: z.string().min(1) })),
      (_req, res) => {
        res.status(201).json({ ok: true });
      },
    );
    testApp.use(errorHandler);

    const bad = await request(testApp).post("/widgets").send({ name: "" });
    expect(bad.status).toBe(422);
    expect(bad.body.error.code).toBe("VALIDATION");
    expect(bad.body.error.message).toContain("name");

    const extraKey = await request(testApp)
      .post("/widgets")
      .send({ name: "ok", sneaky: 1 });
    expect(extraKey.status).toBe(422);

    const good = await request(testApp).post("/widgets").send({ name: "ok" });
    expect(good.status).toBe(201);
  });

  it("a thrown non-CustomError returns 500 INTERNAL with no stack key", async () => {
    const testApp = express();
    testApp.get("/boom", () => {
      throw new Error("kaboom");
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL");
    expect(res.body.error.stack).toBeUndefined();
    expect("stack" in res.body).toBe(false);
    // Non-production keeps the message; production would say "An unexpected error occurred."
    expect(res.body.error.message).toBe("kaboom");
  });

  it("malformed JSON returns 400 BAD_REQUEST with no stack", async () => {
    const res = await request(app)
      .post("/users/login")
      .set("Content-Type", "application/json")
      .send("{ not json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
    expect(res.body.error.stack).toBeUndefined();
  });
});

describe("Sentry integration", () => {
  it("stays disabled without SENTRY_DSN and its helpers are safe no-ops", () => {
    expect(isSentryEnabled()).toBe(false);
    expect(() =>
      captureException(new Error("boom"), { path: "/x" }),
    ).not.toThrow();
  });
});
