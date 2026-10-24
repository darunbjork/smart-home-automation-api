export interface Scene {
  _id: string;
  name: string;
  active: boolean;
}

export const sceneApi = {
  getByHousehold: async (_householdId: string): Promise<Scene[]> => {
    return [{ _id: "1", name: "Movie Mode", active: false }];
  },
  activate: async (_sceneId: string): Promise<void> => {
    // Mock: no real scene engine yet.
  },
  create: async (data: Record<string, unknown>): Promise<Scene> => {
    return { ...data, _id: Date.now().toString() } as Scene;
  },
};
