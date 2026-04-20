import axios from 'axios'; // Corrected import path for axios

export const aiService = {
  processCommand: async (prompt: string, devices: any[]) => {
    try {
      // Use axios.post as api might be the default axios instance
      const res = await axios.post("/ai/process", { prompt, devices });
      // Assuming the backend returns actions in res.data.actions
      return res.data.actions || [];
    } catch (error) {
      console.error("Error calling AI service:", error);
      // Re-throw or handle error appropriately
      throw error;
    }
  },
};
