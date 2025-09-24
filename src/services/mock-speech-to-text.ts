// Mock speech-to-text service for testing
// This simulates transcription without requiring external APIs

export interface MockTranscriptionResult {
  text: string;
  confidence: number;
  timestamp: number;
}

export class MockSpeechToTextService {
  private isInitialized: boolean = true;
  private mockResponses: string[] = [
    "Hello, this is a test of the speech recognition system.",
    "The microphone is working correctly and capturing audio.",
    "This is a demonstration of the speech-to-text functionality.",
    "The system is processing audio data in real-time.",
    "Thank you for testing the speech recognition feature.",
    "The audio quality is good and the transcription is accurate.",
    "This mock service simulates real speech-to-text processing.",
    "The system is ready for production use.",
    "All audio processing features are working as expected.",
    "The speech recognition accuracy is excellent."
  ];
  private responseIndex: number = 0;

  constructor() {
    console.log('🎭 Mock Speech-to-Text Service initialized');
  }

  /**
   * Mock transcription that simulates real speech-to-text
   * @param audioBlob - Audio blob (ignored in mock)
   * @param mimeType - MIME type (ignored in mock)
   * @returns Promise<MockTranscriptionResult>
   */
  async transcribeAudio(audioBlob: Blob, mimeType: string): Promise<MockTranscriptionResult> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Get next mock response
    const text = this.mockResponses[this.responseIndex % this.mockResponses.length];
    this.responseIndex++;

    // Simulate confidence based on audio size
    const confidence = Math.min(0.95, 0.7 + (audioBlob.size / 10000) * 0.25);

    console.log(`🎭 Mock transcription: "${text}" (confidence: ${confidence.toFixed(2)})`);

    return {
      text: text,
      confidence: confidence,
      timestamp: Date.now()
    };
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
    return this.isInitialized;
  }
}

// Export singleton instance
export const mockSpeechToTextService = new MockSpeechToTextService();
