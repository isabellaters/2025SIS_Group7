import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

let genAI: GoogleGenerativeAI;
let model: any;

export const setupGoogleAI = (): void => {
  try {
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY is required');
    }

    genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const modelName = process.env.GOOGLE_AI_MODEL || 'gemini-pro';
    model = genAI.getGenerativeModel({ model: modelName });

    logger.info(`✅ Google AI initialized successfully with model: ${modelName}`);
  } catch (error) {
    logger.error('❌ Google AI initialization failed:', error);
    throw error;
  }
};

export const getGoogleAIModel = () => {
  if (!model) {
    throw new Error('Google AI not initialized. Call setupGoogleAI() first.');
  }
  return model;
};

export const generateText = async (prompt: string, options?: {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}): Promise<string> => {
  try {
    const aiModel = getGoogleAIModel();
    const result = await aiModel.generateContent(prompt, {
      generationConfig: {
        temperature: options?.temperature || 0.7,
        maxOutputTokens: options?.maxOutputTokens || 2048,
        topP: options?.topP || 0.8,
        topK: options?.topK || 40,
      },
    });

    const response = await result.response;
    return response.text();
  } catch (error) {
    logger.error('Error generating text with Google AI:', error);
    throw new Error('Failed to generate text with AI');
  }
};

export const generateStreamingText = async (prompt: string, onChunk: (chunk: string) => void, options?: {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}): Promise<void> => {
  try {
    const aiModel = getGoogleAIModel();
    const result = await aiModel.generateContentStream(prompt, {
      generationConfig: {
        temperature: options?.temperature || 0.7,
        maxOutputTokens: options?.maxOutputTokens || 2048,
        topP: options?.topP || 0.8,
        topK: options?.topK || 40,
      },
    });

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        onChunk(chunkText);
      }
    }
  } catch (error) {
    logger.error('Error generating streaming text with Google AI:', error);
    throw new Error('Failed to generate streaming text with AI');
  }
};

export const analyzeContent = async (content: string, analysisType: 'summary' | 'translation' | 'sentiment' | 'extraction'): Promise<string> => {
  const prompts = {
    summary: `Please provide a concise summary of the following content:\n\n${content}`,
    translation: `Please translate the following content to English:\n\n${content}`,
    sentiment: `Please analyze the sentiment of the following content (positive, negative, or neutral):\n\n${content}`,
    extraction: `Please extract key information from the following content:\n\n${content}`,
  };

  return generateText(prompts[analysisType]);
};

export const generateSubtitles = async (audioTranscript: string, language: string = 'en'): Promise<string> => {
  const prompt = `Please generate accurate subtitles in ${language} for the following audio transcript. Format the output as WebVTT with proper timestamps:\n\n${audioTranscript}`;
  return generateText(prompt, { temperature: 0.3 });
};
