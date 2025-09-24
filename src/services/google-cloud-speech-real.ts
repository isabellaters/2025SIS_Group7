// Real Google Cloud Speech-to-Text service using @google-cloud/speech
import { SpeechClient } from '@google-cloud/speech';

export interface GoogleCloudTranscriptionResult {
  text: string;
  confidence: number;
  timestamp: number;
}

export class GoogleCloudSpeechRealService {
  private speechClient: SpeechClient | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      // Initialize the Speech-to-Text client
      // This will use Application Default Credentials (ADC) or environment variables
      this.speechClient = new SpeechClient({
        // You can specify project ID here if needed
        // projectId: 'your-project-id'
      });
      
      this.isInitialized = true;
      console.log('✅ Google Cloud Speech-to-Text service initialized successfully');
      console.log('💡 Make sure you have set up authentication (ADC or GOOGLE_APPLICATION_CREDENTIALS)');
    } catch (error) {
      console.error('❌ Failed to initialize Google Cloud Speech-to-Text service:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Transcribe audio using Google Cloud Speech-to-Text
   * @param audioBlob - Audio blob to transcribe
   * @param mimeType - MIME type of the audio
   * @returns Promise<GoogleCloudTranscriptionResult>
   */
  async transcribeAudio(audioBlob: Blob, mimeType: string): Promise<GoogleCloudTranscriptionResult> {
    if (!this.isInitialized || !this.speechClient) {
      throw new Error('Google Cloud Speech-to-Text service not initialized');
    }

    try {
      console.log('🎤 Starting Google Cloud Speech-to-Text transcription...');
      console.log('📦 Audio blob size:', audioBlob.size, 'bytes');
      console.log('🎵 MIME type:', mimeType);

      // Convert blob to buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBytes = new Uint8Array(arrayBuffer);

      // Configure the request
      const request = {
        audio: {
          content: Buffer.from(audioBytes).toString('base64'),
        },
        config: {
          encoding: this.getAudioEncoding(mimeType),
          sampleRateHertz: 16000,
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: false,
          model: 'latest_long', // Use the latest long-form model
        },
      };

      console.log('🔄 Sending request to Google Cloud Speech-to-Text...');

      // Perform the transcription
      const [response] = await this.speechClient.recognize(request);
      
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
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
export const googleCloudSpeechRealService = new GoogleCloudSpeechRealService();
