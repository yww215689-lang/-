import { GoogleGenAI, Type } from "@google/genai";
import { GEMINI_MODEL_TEXT, SYSTEM_PROMPT_PDF_PARSER, STORAGE_KEY_API_KEY } from "../constants";
import { ParsedQuestionRaw } from "../types";

// Helper to get client instance dynamically
const getAiClient = () => {
  // Priority: Local Storage -> Environment Variable -> Empty
  // Note: process.env might not be fully polyfilled in all local environments, so we safeguard it.
  const envKey = (window as any).process?.env?.API_KEY || '';
  const localKey = localStorage.getItem(STORAGE_KEY_API_KEY);
  const apiKey = localKey || envKey;

  if (!apiKey) {
    throw new Error("API Key 未配置。请在设置页面填写您的 Google Gemini API Key。");
  }

  return new GoogleGenAI({ apiKey });
};

interface GenerationInput {
  type: 'file' | 'text'; // 'file' covers PDF and Images
  data: string; 
  mimeType?: string;
}

/**
 * Counts occurrences of a substring in a string.
 */
const countOccurrences = (str: string, subString: string) => {
  return str.split(subString).length - 1;
};

export const generateQuestionsFromInput = async (
  input: GenerationInput,
  onProgress?: (count: number) => void
): Promise<ParsedQuestionRaw[]> => {
  try {
    // Initialize client here to ensure we use the latest key
    const ai = getAiClient();

    let parts: any[] = [];
    let promptText = "";

    if (input.type === 'file') {
      parts.push({
        inlineData: {
          mimeType: input.mimeType || 'application/pdf',
          data: input.data,
        },
      });
      promptText = "Analyze this file. Extract ALL multiple-choice questions.\n" +
                   "Clean the data: Remove page numbers, headers, footers, and any screenshot UI elements.\n" + 
                   "Return strictly as a JSON Array.";
    } else {
      promptText = "Extract ALL multiple-choice questions from this data. Return strictly as a JSON Array.\n\n" + 
                   "--- DATA START ---\n" + input.data + "\n--- DATA END ---";
    }

    parts.push({ text: promptText });

    // Use generateContentStream for real-time progress
    const resultStream = await ai.models.generateContentStream({
      model: GEMINI_MODEL_TEXT,
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_PROMPT_PDF_PARSER,
        responseMimeType: "application/json",
        maxOutputTokens: 20000, 
        temperature: 0.1, // Lower temperature for more deterministic/strict extraction
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              answerIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
            },
            required: ["question", "options", "answerIndex", "explanation"],
          },
        },
      },
    });

    let fullText = "";
    
    for await (const chunk of resultStream) {
      const chunkText = chunk.text || "";
      fullText += chunkText;
      
      if (onProgress) {
        const count = countOccurrences(fullText, '"question":');
        onProgress(count);
      }
    }

    if (fullText) {
      try {
        const parsed = JSON.parse(fullText) as ParsedQuestionRaw[];
        return parsed;
      } catch (e) {
        console.warn("JSON Parse failed on full text, trying to salvage...");
        if (fullText.trim().startsWith('[') && !fullText.trim().endsWith(']')) {
             try {
                 const fixedText = fullText + ']';
                 return JSON.parse(fixedText) as ParsedQuestionRaw[];
             } catch (e2) {
                 throw new Error("生成的格式不完整，请重试");
             }
        }
        throw e;
      }
    }
    
    throw new Error("AI 未返回任何内容");

  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw error;
  }
};