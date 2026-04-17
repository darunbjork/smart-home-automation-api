// src/api/member.api.ts
import axios from 'axios'; 

export const memberApi = {
  // Extract members from the GET /households/:id response
  getMembers: (householdId: string): Promise<any[]> =>
    axios.get(`/households/${householdId}`).then((r: any) => r.data.members || []), // Used axios directly and typed 'r'

  // Match the backend's expected body payload exactly
  inviteMember: (householdId: string, email: string): Promise<any> =>
    axios.post(`/households/invite`, { 
      householdId: householdId, 
      inviteeEmail: email 
    }).then((r: any) => r.data) // Used axios directly and typed 'r'
};
