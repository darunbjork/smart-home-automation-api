import axios from "axios";

export const aiService = {
  processCommand: async (
    prompt: string,
    devices: Array<Record<string, unknown>>,
  ): Promise<unknown[]> => {
    const res = await axios.post<{ actions?: unknown[] }>("/ai/process", {
      prompt,
      devices,
    });
    return res.data.actions ?? [];
  },
};
