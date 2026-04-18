import axios from 'axios';

export interface Invitation {
  _id: string;
  householdName: string;
  inviterEmail: string;
  token: string;
}

export const invitationApi = {
  getPending: () => axios.get('/households/invitations').then((r: any) => r.data.invitations),
  accept: (token: string) => axios.post('/households/invitations/accept', { token }),
  decline: (token: string) => axios.post('/households/invitations/decline', { token }),
};
