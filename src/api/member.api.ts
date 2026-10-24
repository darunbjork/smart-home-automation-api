import axios from "axios";

export const memberApi = {
  getMembers: async (householdId: string): Promise<unknown[]> => {
    const r = await axios.get<{ members?: unknown[] }>(
      `/households/${householdId}`,
    );
    return r.data.members ?? [];
  },

  inviteMember: async (
    householdId: string,
    email: string,
  ): Promise<unknown> => {
    const r = await axios.post(`/households/invite`, {
      householdId: householdId,
      inviteeEmail: email,
    });
    return r.data;
  },
};
