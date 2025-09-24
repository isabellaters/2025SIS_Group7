// Google Cloud Speech-to-Text handler for Electron main process
import { SpeechClient } from '@google-cloud/speech';

export interface TranscriptionRequest {
  audioData: string; // base64 encoded audio
  mimeType: string;
}

export interface TranscriptionResponse {
  text: string;
  confidence: number;
  timestamp: number;
  error?: string;
}

export class SpeechToTextHandler {
  private speechClient: SpeechClient | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      // Initialize the Speech-to-Text client in the main process
      this.speechClient = new SpeechClient({
        // This will use Application Default Credentials (ADC) or environment variables
      });
      
      this.isInitialized = true;
      console.log('✅ Google Cloud Speech-to-Text service initialized in main process');
    } catch (error) {
      console.error('❌ Failed to initialize Google Cloud Speech-to-Text service:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Transcribe audio using Google Cloud Speech-to-Text
   * @param request - Transcription request with audio data
   * @returns Promise<TranscriptionResponse>
   */
  async transcribeAudio(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    if (!this.isInitialized || !this.speechClient) {
      return {
        text: '',
        confidence: 0,
        timestamp: Date.now(),
        error: 'Google Cloud Speech-to-Text service not initialized'
      };
    }

    try {
      console.log('🎤 Starting Google Cloud Speech-to-Text transcription in main process...');
      console.log('📦 Audio data length:', request.audioData.length, 'characters');
      console.log('🎵 MIME type:', request.mimeType);

      // Configure the request
      const speechRequest = {
        audio: {
          content: request.audioData,
        },
        config: {
          encoding: this.getAudioEncoding(request.mimeType),
          sampleRateHertz: 16000,
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: false,
          model: 'latest_long',
        },
      };

      console.log('🔄 Sending request to Google Cloud Speech-to-Text...');

      // Perform the transcription
      const [response] = await this.speechClient.recognize(speechRequest);
      
      if (!response.results || response.results.length === 0) {
        console.log('🔇 No speech detected in audio');
        return {
          text: '',
          confidence: 0,
          timestamp: Date.now()
        };
      }

      // Get the best result
      const result = response.results[0];
      const alternative = result.alternatives?.[0];
      
      if (!alternative) {
        console.log('🔇 No transcription alternatives found');
        return {
          text: '',
          confidence: 0,
          timestamp: Date.now()
        };
      }

      const text = alternative.transcript || '';
      const confidence = alternative.confidence || 0;

      console.log('✅ Transcription completed successfully');
      console.log('📝 Text:', text);
      console.log('🎯 Confidence:', confidence);

      return {
        text: text,
        confidence: confidence,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('❌ Error transcribing audio with Google Cloud Speech-to-Text:', error);
      return {
        text: '',
        confidence: 0,
        timestamp: Date.now(),
        error: `Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Convert MIME type to Google Cloud Speech encoding
   * @param mimeType - MIME type of the audio
   * @returns Google Cloud Speech encoding
   */
  private getAudioEncoding(mimeType: string): string {
    if (mimeType.includes('webm')) {
      return 'WEBM_OPUS';
    } else if (mimeType.includes('wav')) {
      return 'LINEAR16';
    } else if (mimeType.includes('mp3')) {
      return 'MP3';
    } else if (mimeType.includes('flac')) {
      return 'FLAC';
    } else {
      // Default to WEBM_OPUS for unknown types
      return 'WEBM_OPUS';
    }
  }

  /**
   * Check if the service is initialized
   * @returns boolean
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if the service is ready
   * @returns boolean
   */
  isReady(): boolean {
    return this.isInitialized && this.speechClient !== null;
  }
}

// Export singleton instance
export const speechToTextHandler = new SpeechToTextHandler();
