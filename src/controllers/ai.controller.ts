import { Request, Response, NextFunction } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CustomError } from "../middleware/error.middleware";

const parseActions = (responseText: string): any[] => {
  console.warn("parseActions is a placeholder and needs a proper implementation.");
  try {
    return JSON.parse(responseText);
  } catch (e) {
    console.error("Failed to parse AI response as JSON:", e);
    return [];
  }
};

export const processAICommand = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt, devices } = req.body;
    const user = req.user; 

    if (!process.env.GEMINI_API_KEY) {
        throw new CustomError("GEMINI_API_KEY is not set in environment variables.", 500);
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const fullPrompt = `User prompt: "${prompt}".
      User ID: "${user?.userId}". User role: "${user?.role}".
      Current devices: ${JSON.stringify(devices)}.
      Please determine the specific actions to perform on the devices based on the user's prompt.
      Respond with a JSON array of actions. Each action should be an object with 'deviceId' and 'command' properties.
      For example, a valid output might look like: [{"deviceId": "light-123", "command": "turn_off"}, {"deviceId": "thermostat-456", "command": "set_temperature", "value": 22}].`;

    const result = await model.generateContent(fullPrompt);
    const responseText = await result.response.text();

    const actions = parseActions(responseText); 

    res.json({ actions });
  } catch (error) {
    console.error("AI processing failed:", error);
    if (error instanceof CustomError) {
      next(error);
    } else {
      next(new CustomError("AI processing failed. Please try again later.", 500));
    }
  }
};
