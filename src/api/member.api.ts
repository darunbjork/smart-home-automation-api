import axios from 'axios'; 

export const memberApi = {
  getMembers: (householdId: string): Promise<any[]> =>
    axios.get(`/households/${householdId}`).then((r: any) => r.data.members || []), 

  inviteMember: (householdId: string, email: string): Promise<any> =>
    axios.post(`/households/invite`, { 
      householdId: householdId, 
      inviteeEmail: email 
    }).then((r: any) => r.data)
};
