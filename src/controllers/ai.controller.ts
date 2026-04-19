import { Request, Response, NextFunction } from "express";
import { CustomError } from "../middleware/error.middleware";

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is missing. Please set it in your .env file.");
}

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const parseActions = (responseText: string): any[] => {
  console.warn("Parsing AI response text. Expecting JSON array of actions.");
  const jsonMatch = responseText.match(/\[.*\]/s); 
  if (!jsonMatch) {
    console.error("AI response did not contain a valid JSON array.");
    return [];
  }

  try {
    const actions = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(actions)) {
      console.error("Parsed JSON is not an array.");
      return [];
    }
    return actions;
  } catch (e) {
    console.error("Failed to parse AI response JSON:", e);
    return [];
  }
};

export const processAICommand = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt, devices } = req.body;
    const user = req.user; 

    if (!GEMINI_API_KEY) {
        throw new CustomError("AI service is not configured. GEMINI_API_KEY is missing.", 500);
    }

    const deviceContext = devices.map((d: any) => ({
      id: d._id,
      name: d.name,
      status: d.data?.on ? "on" : "off",
    }));

    const systemInstruction = `
      Current Home State: ${JSON.stringify(deviceContext)}
      User Input: "${prompt}"
      Requirement: Generate a JSON array of actions.
      Rules:
      - Each action's "id" MUST exactly match one of the "id" fields in the Current Home State.
      - Do NOT use generic IDs like "all-lights", "everything", or any word not in the list.
      - If the user asks to turn off all lights, return one action per light device.
      - Format: [{"id": string, "action": "on" | "off"}]
      - Only return the JSON array. No explanations.
    `;

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemInstruction }] }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error response:", errorText);
      throw new CustomError(`AI service unavailable or returned an error: ${response.status} ${response.statusText}`, 503);
    }

    const data = response.json() as Promise<GeminiResponse>;
    const typedData = await data;

    let aiResponseText = "";
    if (typedData.candidates && typedData.candidates.length > 0 && typedData.candidates[0].content && typedData.candidates[0].content.parts && typedData.candidates[0].content.parts.length > 0 && typedData.candidates[0].content.parts[0].text) {
      aiResponseText = typedData.candidates[0].content.parts[0].text;
    } else {
      console.error("Unexpected response structure from Gemini API:", typedData);
      throw new CustomError("Failed to parse AI response structure.", 500);
    }

    const actions = parseActions(aiResponseText);

    const validActions = actions.filter((action: any) =>
      devices.some((d: any) => d._id === action.id)
    );
    console.log(`AI generated ${actions.length} actions, ${validActions.length} are valid.`);

    res.json({ actions: validActions });

  } catch (error) {
    console.error("AI command processing failed:", error);
    if (error instanceof CustomError) {
      next(error);
    } else {
      next(new CustomError("AI processing failed. Please try again later.", 500));
    }
  }
};
