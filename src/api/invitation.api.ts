import axios from "axios";

export interface Invitation {
  _id: string;
  householdName: string;
  inviterEmail: string;
  token: string;
}

export const invitationApi = {
  getPending: async (): Promise<Invitation[]> => {
    const r = await axios.get<{ invitations: Invitation[] }>(
      "/households/invitations",
    );
    return r.data.invitations;
  },
  accept: (token: string) =>
    axios.post("/households/invitations/accept", { token }),
  decline: (token: string) =>
    axios.post("/households/invitations/decline", { token }),
};
