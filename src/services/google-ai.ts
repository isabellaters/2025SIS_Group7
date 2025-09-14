import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google AI with API key from environment variables
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_API_KEY);

export interface TranscriptionResult {
  text: string;
  confidence: number;
  timestamp: number;
}

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

export class GoogleAIService {
  private model: any;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  /**
   * Transcribe audio data to text using Google AI
   * @param audioData - Base64 encoded audio data
   * @param mimeType - MIME type of the audio (e.g., 'audio/wav', 'audio/mp3')
   * @returns Promise<TranscriptionResult>
   */
  async transcribeAudio(audioData: string, mimeType: string = 'audio/wav'): Promise<TranscriptionResult> {
    try {
      const prompt = "Transcribe the following audio to text. Return only the transcribed text without any additional formatting or explanations.";
      
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: audioData,
            mimeType: mimeType
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();
      
      return {
        text: text.trim(),
        confidence: 0.9, // Gemini doesn't provide confidence scores, using default
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  /**
   * Translate text using Google AI
   * @param text - Text to translate
   * @param targetLanguage - Target language code (e.g., 'es', 'fr', 'de')
   * @param sourceLanguage - Source language code (optional, auto-detect if not provided)
   * @returns Promise<TranslationResult>
   */
  async translateText(
    text: string, 
    targetLanguage: string, 
    sourceLanguage?: string
  ): Promise<TranslationResult> {
    try {
      const languagePrompt = sourceLanguage 
        ? `Translate the following ${sourceLanguage} text to ${targetLanguage}:`
        : `Translate the following text to ${targetLanguage} (detect the source language automatically):`;
      
      const result = await this.model.generateContent([
        `${languagePrompt}\n\n${text}`
      ]);

      const response = await result.response;
      const translatedText = response.text();
      
      return {
        translatedText: translatedText.trim(),
        sourceLanguage: sourceLanguage || 'auto-detected',
        targetLanguage,
        confidence: 0.9
      };
    } catch (error) {
      console.error('Error translating text:', error);
      throw new Error('Failed to translate text');
    }
  }

  /**
   * Get supported languages for translation
   * @returns Array of supported language codes
   */
  getSupportedLanguages(): string[] {
    return [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi',
      'nl', 'sv', 'da', 'no', 'fi', 'pl', 'cs', 'hu', 'ro', 'bg', 'hr', 'sk',
      'sl', 'et', 'lv', 'lt', 'el', 'tr', 'th', 'vi', 'id', 'ms', 'tl', 'sw'
    ];
  }
}

// Export singleton instance
export const googleAIService = new GoogleAIService();
