import { Request, Response, NextFunction } from "express";
import { CustomError } from "../middleware/error.middleware";

// Interface to define the expected structure of the Gemini API response
interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
  // Add other fields if necessary, e.g., promptFeedback, usageMetadata
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Ensure the API key is set before proceeding
if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is missing. Please set it in your .env file.");
}

// Updated model name to gemini-1.0-pro as suggested for potential 404 errors.
// If this still fails, consider trying 'gemini-1.5-flash-latest' or 'gemini-1.5-pro-latest'.
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${GEMINI_API_KEY}`;

// Helper function to parse the AI response.
// It extracts the JSON array of actions from the AI's text output.
const parseActions = (responseText: string): any[] => {
  console.warn("Parsing AI response text. Expecting JSON array of actions.");
  const jsonMatch = responseText.match(/\[.*\]/s); // Regex to extract JSON array
  if (!jsonMatch) {
    console.error("AI response did not contain a valid JSON array.");
    return []; // Return empty array if no JSON array is found
  }

  try {
    const actions = JSON.parse(jsonMatch[0]);
    // Basic validation: ensure it's an array
    if (!Array.isArray(actions)) {
      console.error("Parsed JSON is not an array.");
      return [];
    }
    // Further validation could be added here to check action structure
    return actions;
  } catch (e) {
    console.error("Failed to parse AI response JSON:", e);
    return []; // Return empty array if JSON parsing fails
  }
};

export const processAICommand = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt, devices } = req.body;
    const user = req.user; // Authenticated user info from middleware

    // Double-check API key availability at runtime for safety
    if (!GEMINI_API_KEY) {
        throw new CustomError("AI service is not configured. GEMINI_API_KEY is missing.", 500);
    }

    // Prepare context for the AI, including user details and device states
    const deviceContext = devices.map((d: any) => ({ // Type 'any' for devices is a placeholder, assuming it matches structure.
      id: d._id,
      name: d.name,
      status: d.data?.on ? "on" : "off", // Determine status from 'data.on' property
    }));

    // Construct a detailed system instruction for the AI
    const systemInstruction = `
      Current Home State: ${JSON.stringify(deviceContext)}
      User Input: "${prompt}"
      Requirement: Generate a JSON array of specific actions to control the smart home devices.
      Format: [{"id": string, "action": "on" | "off", "value"?: any}] (e.g., {"id": "light-123", "action": "on"})
      Constraint: Only return the JSON array. Do not include any conversational text or explanations.
    `;

    // Make the API call using fetch
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemInstruction }] }],
      }),
    });

    // Handle API response status
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error response:", errorText);
      // Provide a more informative error based on API response if possible
      throw new CustomError(`AI service unavailable or returned an error: ${response.status} ${response.statusText}`, 503);
    }

    // Parse the successful response with the defined type
    const data = response.json() as Promise<GeminiResponse>;
    const typedData = await data; // Await the promise to get the typed data

    // Extract the AI's generated text content safely
    let aiResponseText = "";
    if (typedData.candidates && typedData.candidates.length > 0 && typedData.candidates[0].content && typedData.candidates[0].content.parts && typedData.candidates[0].content.parts.length > 0 && typedData.candidates[0].content.parts[0].text) {
      aiResponseText = typedData.candidates[0].content.parts[0].text;
    } else {
      console.error("Unexpected response structure from Gemini API:", typedData);
      throw new CustomError("Failed to parse AI response structure.", 500);
    }

    // Parse the extracted text to get the actions
    const actions = parseActions(aiResponseText);
    res.json({ actions });

  } catch (error) {
    console.error("AI command processing failed:", error);
    // Pass the error to the global error handler middleware
    if (error instanceof CustomError) {
      next(error);
    } else {
      next(new CustomError("AI processing failed. Please try again later.", 500));
    }
  }
};
