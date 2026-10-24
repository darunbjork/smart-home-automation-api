import { connect, disconnect } from "mongoose";
import request from "supertest";
import app from "../src/app";
import { Actor, auth, registerActor } from "./helpers/actors";

jest.setTimeout(60_000);

describe("user routes (T4)", () => {
  let alice: Actor;
  let bob: Actor;

  beforeAll(async () => {
    await connect(process.env.MONGO_URI as string);
    alice = await registerActor("aliceuser");
    bob = await registerActor("bobjones");
  });

  afterAll(async () => {
    await disconnect();
  });

  describe("GET /users/profile", () => {
    it("200 with households carrying ownerId", async () => {
      const res = await request(app)
        .get("/users/profile")
        .set(auth(alice.token))
        .expect(200);

      expect(res.body.user._id).toBe(alice.userId);
      expect(res.body.user.username).toBe("aliceuser");
      expect(Array.isArray(res.body.user.households)).toBe(true);
      expect(res.body.user.households).toHaveLength(1);
      expect(res.body.user.households[0]).toEqual({
        _id: alice.householdId,
        name: "aliceuser-home",
        ownerId: alice.userId,
      });
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.error).toBeUndefined();
    });

    it("401 without a token", async () => {
      await request(app).get("/users/profile").expect(401);
    });

    it("is matched before /:id (not treated as a user id)", async () => {
      const res = await request(app)
        .get("/users/profile")
        .set(auth(bob.token))
        .expect(200);
      expect(res.body.user._id).toBe(bob.userId);
    });
  });

  describe("GET /users/:id", () => {
    it("returns your own record", async () => {
      const res = await request(app)
        .get(`/users/${alice.userId}`)
        .set(auth(alice.token))
        .expect(200);
      expect(res.body.user._id).toBe(alice.userId);
    });

    it("404 for another user, even for a household owner", async () => {
      await request(app)
        .get(`/users/${bob.userId}`)
        .set(auth(alice.token))
        .expect(404);
    });
  });

  describe("PATCH /users/:id", () => {
    it("updates your own username", async () => {
      const res = await request(app)
        .patch(`/users/${alice.userId}`)
        .set(auth(alice.token))
        .send({ username: "aliceupdated" })
        .expect(200);
      expect(res.body.user.username).toBe("aliceupdated");
      // restore for other assertions
      alice = { ...alice };
    });

    it("rejects role escalation with 422", async () => {
      await request(app)
        .patch(`/users/${alice.userId}`)
        .set(auth(alice.token))
        .send({ role: "owner" })
        .expect(422);
    });

    it("rejects unknown fields (isActive, households, password) with 422", async () => {
      await request(app)
        .patch(`/users/${alice.userId}`)
        .set(auth(alice.token))
        .send({ isActive: false, households: [], password: "hacked-password" })
        .expect(422);
    });

    it("404 when targeting another user", async () => {
      await request(app)
        .patch(`/users/${bob.userId}`)
        .set(auth(alice.token))
        .send({ username: "bobrenamed" })
        .expect(404);
    });
  });

  describe("login failure is uniform (no user enumeration)", () => {
    it("unknown email and wrong password return the same body", async () => {
      const unknownEmail = await request(app)
        .post("/users/login")
        .send({
          email: "definitely-not-registered@example.test",
          password: "some-password-value",
        })
        .expect(401);

      const wrongPassword = await request(app)
        .post("/users/login")
        .send({
          email: "aliceuser@example.test",
          password: "wrong-password-value",
        })
        .expect(401);

      expect(unknownEmail.body).toEqual(wrongPassword.body);
      expect(unknownEmail.body.error.message).toBe(
        "Invalid email or password.",
      );
      expect(unknownEmail.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("removed endpoints", () => {
    it("GET /users and DELETE /users/:id return 404", async () => {
      await request(app).get("/users").set(auth(alice.token)).expect(404);
      await request(app)
        .delete(`/users/${bob.userId}`)
        .set(auth(alice.token))
        .expect(404);
    });
  });
});
