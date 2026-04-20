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

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const parseActions = (responseText: string): any[] => {
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("JSON parse failed:", e);
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
You are a smart home assistant. You will be given a list of current devices (id, name, type, status).
Convert the user's request into a JSON array of actions.

Current devices:
${JSON.stringify(deviceContext, null, 2)}

User request: "${prompt}"

Examples:
- If devices = [{"id": "123", "name": "Living Room Light", "type": "light", "status": "on"}]
  and user says "turn off living room light" → [{"id": "123", "action": "off"}]
- If devices = [] → return [] (no devices)

Rules:
- Return ONLY a JSON array. No extra text.
- Use the exact "id" from the list.
- Do not invent IDs like "all-lights". For "all lights", return one action per light device.
- Treat concatenated words in the user request as separate words to improve matching with device names.

Now respond with JSON array:
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
     console.log("Raw AI response:", aiResponseText);

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
