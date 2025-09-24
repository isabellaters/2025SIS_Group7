import { GoogleGenerativeAI } from '@google/generative-ai';

export interface TranscriptionResult {
  text: string;
  confidence: number;
  timestamp: number;
}

export class GoogleAIService {
  private genAI: GoogleGenerativeAI | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Try environment variable first
    let apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;
    
    // Fallback to hardcoded key if env var not found
    if (!apiKey) {
      apiKey = 'AIzaSyAs_nans-JchazMk0iIdGMwPGn25Z_6ibU';
      console.log('Using fallback API key');
    }
    
    console.log('Google AI API Key found:', !!apiKey);
    console.log('API Key value:', apiKey ? `${apiKey.substring(0, 10)}...` : 'undefined');
    
    if (!apiKey) {
      console.warn('Google AI API key not found.');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.isInitialized = true;
      console.log('Google AI service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google AI service:', error);
    }
  }

  /**
   * Transcribe audio using Google AI
   * @param audioBlob - Audio blob to transcribe
   * @param mimeType - MIME type of the audio
   * @returns Promise<TranscriptionResult>
   */
  async transcribeAudio(audioBlob: Blob, mimeType: string): Promise<TranscriptionResult> {
    if (!this.isInitialized || !this.genAI) {
      throw new Error('Google AI service not initialized. Please check your API key.');
    }

    try {
      // Convert audio blob to base64
      const base64Audio = await this.audioBlobToBase64(audioBlob);
      
      // Get the generative model
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // Create the prompt for audio transcription
      const prompt = `Please transcribe the following audio file. Return only the transcribed text without any additional formatting or explanations.`;
      
      // Convert base64 to data URL
      const dataUrl = `data:${mimeType};base64,${base64Audio}`;
      
      // Generate content with audio
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Audio,
            mimeType: mimeType
          }
        }
      ]);
      
      const response = await result.response;
      const text = response.text();
      
      return {
        text: text.trim(),
        confidence: 0.9, // Gemini doesn't provide confidence scores, so we use a default
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert audio blob to base64 string
   * @param audioBlob - Audio blob to convert
   * @returns Promise<string> - Base64 encoded audio data
   */
  private async audioBlobToBase64(audioBlob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  }

  /**
   * Check if the service is properly initialized
   * @returns boolean
   */
  isServiceReady(): boolean {
    return this.isInitialized && this.genAI !== null;
  }

  /**
   * Get initialization status
   * @returns boolean
   */
  get initialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const googleAIService = new GoogleAIService();
