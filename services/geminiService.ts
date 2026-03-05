
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorStr = JSON.stringify(error).toLowerCase();
      const message = error?.message?.toLowerCase() || "";
      
      // If quota exceeded, don't waste time with many retries, throw so UI can prompt for key
      if (message.includes("429") || message.includes("quota") || errorStr.includes("resource_exhausted")) {
        console.warn("Quota limit reached. Prompting for user key.");
        throw new Error("QUOTA_EXHAUSTED");
      }

      // Handle invalid or missing entities (often due to an invalid API key or incorrect project)
      if (message.includes("requested entity was not found") || message.includes("404")) {
        console.warn("Entity not found error. Likely an invalid API key or project reference.");
        throw new Error("ENTITY_NOT_FOUND");
      }
      
      if (message.includes("500") || message.includes("503")) {
        await delay(1000 * (i + 1));
        continue;
      }

      throw error;
    }
  }
  throw lastError;
}

export const classifyIssue = async (issueDescription: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Categorize this MNC facility issue into: MEP Systems, Environmental Control, Life Safety, Critical Power, or Civil & Structural. Suggest priority.
      
      Issue: ${issueDescription}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            priority: { type: Type.STRING },
            category: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ["priority", "category", "reason"]
        }
      }
    }));
    return JSON.parse(response.text || '{}');
  } catch (error: any) {
    return null;
  }
};
