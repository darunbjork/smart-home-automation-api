import request from "supertest";
import app from "../../src/app";

export const PASSWORD = "Correct-Horse-9-Battery";

export interface Actor {
  token: string;
  userId: string;
  householdId: string;
  email: string;
}

export const auth = (token: string): { Authorization: string } => ({
  Authorization: `Bearer ${token}`,
});

export const registerActor = async (name: string): Promise<Actor> => {
  const email = `${name}@example.test`;
  const register = await request(app)
    .post("/users/register")
    .send({
      username: name,
      email,
      password: PASSWORD,
      householdName: `${name}-home`,
    });
  if (register.status !== 200 && register.status !== 201) {
    throw new Error(
      `register failed: ${register.status} ${JSON.stringify(register.body)}`,
    );
  }
  const login = await request(app)
    .post("/users/login")
    .send({ email, password: PASSWORD })
    .expect(200);
  const token: string = login.body.accessToken;
  const profile = await request(app)
    .get("/users/profile")
    .set(auth(token))
    .expect(200);
  return {
    token,
    userId: profile.body.user._id,
    householdId: profile.body.user.households[0]._id,
    email,
  };
};

// Makes `member` a member of `owner`'s household through the real
// invite + accept flow. The invite response is identical whether or not the
// address exists, so the token is fetched by the invitee from their own list.
export const addMember = async (owner: Actor, member: Actor): Promise<void> => {
  await request(app)
    .post("/households/invite")
    .set(auth(owner.token))
    .send({ householdId: owner.householdId, inviteeEmail: member.email })
    .expect(200);

  const list = await request(app)
    .get("/households/invitations")
    .set(auth(member.token))
    .expect(200);

  const invitations = list.body.invitations as Array<{
    token: string;
    household: { _id?: string } | string;
  }>;
  const match = invitations.find((invitation) => {
    const householdId =
      typeof invitation.household === "string"
        ? invitation.household
        : invitation.household?._id;
    return householdId === owner.householdId;
  });
  if (!match) {
    throw new Error(
      "Expected a pending invitation for the invitee (adapt this helper or the invite flow).",
    );
  }

  await request(app)
    .post("/households/invitations/accept")
    .set(auth(member.token))
    .send({ token: match.token })
    .expect(200);
};
