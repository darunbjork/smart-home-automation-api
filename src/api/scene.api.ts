export const sceneApi = {
  getByHousehold: async (householdId: string): Promise<any[]> => {
    // Mock data until backend is built
    return [{ _id: "1", name: "Movie Mode", active: false }]; 
  },
  activate: async (sceneId: string): Promise<void> => {
    console.log(`Mock activated scene ${sceneId}`);
  },
  create: async (data: any): Promise<any> => {
    return { ...data, _id: Date.now().toString() };
  }
};
