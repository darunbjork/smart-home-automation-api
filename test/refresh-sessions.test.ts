import crypto from "crypto";
import { connect, disconnect } from "mongoose";
import request from "supertest";
import app from "../src/app";
import logger from "../src/utils/logger";
import User from "../src/models/User";
import Household from "../src/models/Household";
import RefreshSession from "../src/models/RefreshSession";
import Invitation from "../src/models/Invitation";

jest.setTimeout(60_000);

const PASSWORD = "Correct-Horse-9-Battery";
const sha256 = (value: string): string =>
  crypto.createHash("sha256").update(value).digest("hex");

const cookieHeader = (res: request.Response): string | undefined => {
  const raw = res.headers["set-cookie"];
  const cookies: string[] = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? [raw]
      : [];
  const found = cookies.find((c: string) => c.startsWith("hearth_rt="));
  return found;
};

interface Session {
  userId: string;
  accessToken: string;
  cookie?: string;
  refreshToken?: string;
}

const registerAndLogin = async (
  name: string,
  mobile = false,
): Promise<Session> => {
  const email = `${name}@example.test`;
  await request(app)
    .post("/users/register")
    .send({
      username: name,
      email,
      password: PASSWORD,
      householdName: `${name}-home`,
    });
  const login = request(app)
    .post("/users/login")
    .send({ email, password: PASSWORD });
  if (mobile) login.set("X-Client", "mobile");
  const res = await login.expect(200);
  return {
    userId: res.body.user._id as string,
    accessToken: res.body.accessToken as string,
    cookie: cookieHeader(res),
    refreshToken: res.body.refreshToken as string | undefined,
  };
};

describe("refresh sessions (rotation, reuse detection, transports)", () => {
  beforeAll(async () => {
    await connect(process.env.MONGO_URI as string);
    await User.deleteMany({});
    await Household.deleteMany({});
    await Invitation.deleteMany({});
    await RefreshSession.deleteMany({});
  });

  afterAll(async () => {
    await disconnect();
  });

  it("web login sets an HttpOnly hearth_rt cookie scoped to /users and never returns the token in the body", async () => {
    const session = await registerAndLogin("cookieuser");
    expect(session.cookie).toBeDefined();
    const cookie = session.cookie as string;
    expect(cookie).toContain("hearth_rt=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie.toLowerCase()).toContain("path=/users");
    expect(session.refreshToken).toBeUndefined();
    expect(session.userId).toBeTruthy();
  });

  it("mobile login returns the refresh token in the body (no cookie) and refresh accepts it from the Authorization header", async () => {
    const session = await registerAndLogin("mobileuser", true);
    expect(session.cookie).toBeUndefined();
    expect(typeof session.refreshToken).toBe("string");
    const first = session.refreshToken as string;

    const res = await request(app)
      .post("/users/refresh")
      .set("X-Client", "mobile")
      .set("Authorization", `Refresh ${first}`)
      .expect(200);

    expect(typeof res.body.accessToken).toBe("string");
    // Two JWTs signed in the same second can be identical; the opaque
    // refresh token must differ.
    expect(typeof res.body.refreshToken).toBe("string");
    expect(res.body.refreshToken).not.toBe(first);
    expect(cookieHeader(res)).toBeUndefined();
  });

  it("POST /users/refresh rotates the cookie and GET /users/refresh is not a refresh endpoint", async () => {
    const session = await registerAndLogin("rotator");
    const first = session.cookie as string;

    const res = await request(app)
      .post("/users/refresh")
      .set("Cookie", first)
      .expect(200);
    const second = cookieHeader(res);
    expect(second).toBeDefined();
    expect(second).not.toBe(first);

    // The old state-changing GET is gone: as a route it only matches
    // /users/:id and (as an id) does not exist.
    await request(app)
      .get("/users/refresh")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .expect(404);
  });

  it("revokes the whole family when a used token is replayed after the grace window", async () => {
    const session = await registerAndLogin("replayer");
    const cookieA = session.cookie as string;
    const tokenA = cookieA.replace("hearth_rt=", "").split(";")[0];

    // First rotation: A is used, successor B is issued.
    const first = await request(app)
      .post("/users/refresh")
      .set("Cookie", cookieA)
      .expect(200);
    const cookieB = cookieHeader(first) as string;
    const tokenB = cookieB.replace("hearth_rt=", "").split(";")[0];
    expect(tokenB).not.toBe(tokenA);

    // Simulate A being replayed a minute later.
    const original = await RefreshSession.findOne({
      tokenHash: sha256(tokenA),
    });
    const familyId = original?.familyId as string;
    expect(familyId).toBeTruthy();
    await RefreshSession.updateOne(
      { tokenHash: sha256(tokenA) },
      { $set: { usedAt: new Date(Date.now() - 60_000) } },
    );

    await request(app)
      .post("/users/refresh")
      .set("Cookie", cookieA)
      .expect(401);

    // The successor is dead too: the whole family is gone.
    await request(app)
      .post("/users/refresh")
      .set("Cookie", cookieB)
      .expect(401);
    const remaining = await RefreshSession.countDocuments({ familyId });
    expect(remaining).toBe(0);
  });

  it("concurrent refreshes with the same token: exactly one 200, and the successor still works", async () => {
    const session = await registerAndLogin("concurrent");
    const cookie = session.cookie as string;

    const results = await Promise.all([
      request(app).post("/users/refresh").set("Cookie", cookie),
      request(app).post("/users/refresh").set("Cookie", cookie),
      request(app).post("/users/refresh").set("Cookie", cookie),
    ]);

    const ok = results.filter((r) => r.status === 200);
    const rejected = results.filter((r) => r.status === 401);
    expect(ok).toHaveLength(1);
    expect(rejected).toHaveLength(2);

    const successor = cookieHeader(ok[0]) as string;
    await request(app)
      .post("/users/refresh")
      .set("Cookie", successor)
      .expect(200);
  });

  it("rejects a tampered token and logout revokes the family", async () => {
    const session = await registerAndLogin("logoutuser");
    const cookie = session.cookie as string;
    const token = cookie.replace("hearth_rt=", "").split(";")[0];
    const tampered = `A${token.slice(1)}`;

    await request(app)
      .post("/users/refresh")
      .set("Cookie", `hearth_rt=${tampered}`)
      .expect(401);

    const logout = await request(app)
      .post("/users/logout")
      .set("Cookie", cookie)
      .expect(204);
    const cleared = cookieHeader(logout);
    expect(cleared).toBeDefined();
    expect(cleared).toContain("hearth_rt=;");

    await request(app).post("/users/refresh").set("Cookie", cookie).expect(401);
  });

  it("rejects refresh requests from an untrusted Origin", async () => {
    const session = await registerAndLogin("originuser");
    await request(app)
      .post("/users/refresh")
      .set("Cookie", session.cookie as string)
      .set("Origin", "https://evil.example")
      .expect(403);
  });

  it("never logs refresh token values", async () => {
    const captured: string[] = [];
    const capture = (...args: unknown[]): void => {
      captured.push(JSON.stringify(args));
    };
    const spies = [
      jest.spyOn(logger, "info").mockImplementation(capture as never),
      jest.spyOn(logger, "warn").mockImplementation(capture as never),
      jest.spyOn(logger, "error").mockImplementation(capture as never),
      jest.spyOn(logger, "debug").mockImplementation(capture as never),
    ];

    try {
      const session = await registerAndLogin("silentuser", true);
      const token = session.refreshToken as string;
      await request(app)
        .post("/users/refresh")
        .set("X-Client", "mobile")
        .set("Authorization", `Refresh ${token}`)
        .expect(200);
      await request(app)
        .post("/users/logout")
        .set("X-Client", "mobile")
        .set("Authorization", `Refresh ${token}`)
        .expect(204);

      expect(captured.length).toBeGreaterThan(0);
      for (const line of captured) {
        expect(line).not.toContain(token);
      }
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });
});
