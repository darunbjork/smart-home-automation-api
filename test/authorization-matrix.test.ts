import { connect, disconnect } from "mongoose";
import request from "supertest";
import app from "../src/app";
import { Actor, addMember, auth, registerActor } from "./helpers/actors";
import User from "../src/models/User";
import Household from "../src/models/Household";
import Invitation from "../src/models/Invitation";

jest.setTimeout(60_000);

describe("authorization matrix (owner / member / outsider)", () => {
  let owner: Actor;
  let member: Actor;
  let outsider: Actor;

  beforeAll(async () => {
    await connect(process.env.MONGO_URI as string);
    await User.deleteMany({});
    await Household.deleteMany({});
    await Invitation.deleteMany({});
    owner = await registerActor("matrixowner");
    member = await registerActor("matrixmember");
    outsider = await registerActor("matrixoutsider");
    await addMember(owner, member);
  });

  afterAll(async () => {
    await disconnect();
  });

  describe("no token", () => {
    it("any protected route returns 401", async () => {
      await request(app).get(`/households/${owner.householdId}`).expect(401);
      await request(app)
        .patch(`/households/${owner.householdId}`)
        .send({ name: "nope" })
        .expect(401);
      await request(app).get("/users/profile").expect(401);
      // The global user list route no longer exists at all.
      await request(app).get("/users").expect(404);
    });
  });

  describe("GET /households/:id", () => {
    it("owner 200", async () => {
      const res = await request(app)
        .get(`/households/${owner.householdId}`)
        .set(auth(owner.token))
        .expect(200);
      expect(res.body.household._id).toBe(owner.householdId);
    });

    it("member 200", async () => {
      await request(app)
        .get(`/households/${owner.householdId}`)
        .set(auth(member.token))
        .expect(200);
    });

    it("outsider 404 (never 403)", async () => {
      await request(app)
        .get(`/households/${owner.householdId}`)
        .set(auth(outsider.token))
        .expect(404);
    });
  });

  describe("PATCH /households/:id", () => {
    it("outsider 404", async () => {
      await request(app)
        .patch(`/households/${owner.householdId}`)
        .set(auth(outsider.token))
        .send({ name: "Hacked Home" })
        .expect(404);
    });

    it("member 403", async () => {
      await request(app)
        .patch(`/households/${owner.householdId}`)
        .set(auth(member.token))
        .send({ name: "Member Rename" })
        .expect(403);
    });

    it("owner 200", async () => {
      const res = await request(app)
        .patch(`/households/${owner.householdId}`)
        .set(auth(owner.token))
        .send({ name: "Matrix Home" })
        .expect(200);
      expect(res.body.household.name).toBe("Matrix Home");
    });

    it("rejects an invalid name with 422", async () => {
      await request(app)
        .patch(`/households/${owner.householdId}`)
        .set(auth(owner.token))
        .send({ name: "" })
        .expect(422);
    });
  });

  describe("POST /households/invite", () => {
    it("outsider 404", async () => {
      await request(app)
        .post("/households/invite")
        .set(auth(outsider.token))
        .send({
          householdId: owner.householdId,
          inviteeEmail: "fresh-invitee@example.test",
        })
        .expect(404);
    });

    it("member 403", async () => {
      await request(app)
        .post("/households/invite")
        .set(auth(member.token))
        .send({
          householdId: owner.householdId,
          inviteeEmail: "fresh-invitee@example.test",
        })
        .expect(403);
    });

    it("owner 200 with an identical response for unknown addresses", async () => {
      const known = await request(app)
        .post("/households/invite")
        .set(auth(owner.token))
        .send({
          householdId: owner.householdId,
          inviteeEmail: "fresh-invitee@example.test",
        })
        .expect(200);
      const unknown = await request(app)
        .post("/households/invite")
        .set(auth(owner.token))
        .send({
          householdId: owner.householdId,
          inviteeEmail: "nobody-at-all@example.test",
        })
        .expect(200);
      expect(unknown.body).toEqual(known.body);
      expect(unknown.body.invitation).toBeUndefined();
    });
  });

  describe("removed global user routes", () => {
    it("GET /users is gone for everyone", async () => {
      await request(app).get("/users").set(auth(owner.token)).expect(404);
      await request(app).get("/users").set(auth(member.token)).expect(404);
      await request(app).get("/users").set(auth(outsider.token)).expect(404);
    });

    it("DELETE /users/:id is gone for everyone", async () => {
      await request(app)
        .delete(`/users/${member.userId}`)
        .set(auth(owner.token))
        .expect(404);
      await request(app)
        .delete(`/users/${outsider.userId}`)
        .set(auth(outsider.token))
        .expect(404);
    });

    it("another user's record is not readable (404, not 403)", async () => {
      await request(app)
        .get(`/users/${outsider.userId}`)
        .set(auth(owner.token))
        .expect(404);
    });
  });

  // Destructive: keep last.
  describe("DELETE /households/:id", () => {
    it("outsider 404", async () => {
      await request(app)
        .delete(`/households/${owner.householdId}`)
        .set(auth(outsider.token))
        .expect(404);
    });

    it("member 403", async () => {
      await request(app)
        .delete(`/households/${owner.householdId}`)
        .set(auth(member.token))
        .expect(403);
    });

    it("owner 200", async () => {
      await request(app)
        .delete(`/households/${owner.householdId}`)
        .set(auth(owner.token))
        .expect(200);
      const stillThere = await Household.findById(owner.householdId);
      expect(stillThere).toBeNull();
    });
  });
});
