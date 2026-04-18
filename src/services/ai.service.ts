import axios from 'axios'; 
import type { IDevice } from "../models/Device"; 

export interface AISmartAction {
  id: string; 
  action: "on" | "off"; 
}

export const aiService = {
  /**
   * Sends a natural language command to the AI backend to process and generate smart home actions.
   * @param prompt The natural language command from the user (e.g., "Turn off the living room light").
   * @param devices The current list of devices in the household, including their state.
   * @returns A promise that resolves to an array of AI-generated smart home actions.
   */
  processCommand: async (prompt: string, devices: IDevice[]): Promise<AISmartAction[]> => { // Using IDevice for type
    try {
      const response = await axios.post("/ai/command", { prompt, devices });
      return response.data.actions;
    } catch (error) {
      console.error("Error processing AI command:", error);
      throw error;
    }
  },
};
