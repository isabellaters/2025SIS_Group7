import { Duplex } from 'stream';

export interface TranscriptResult {
  transcript: string;
  isFinal: boolean;
  confidence?: number;
}

export class SpeechToTextService {
  private recognizeStream: any = null;

  /**
   * Create a streaming recognition session (mock)
   */
  startStreaming(
    onTranscript: (result: TranscriptResult) => void,
    onError: (error: Error) => void
  ): Duplex {
    console.log('Starting mock Google Speech-to-Text streaming...');

    // Create a mock stream that simulates speech recognition
    const mockStream = new Duplex({
      write(chunk, encoding, callback) {
        // Simulate processing audio chunks
        console.log('Mock processing audio chunk:', chunk.length, 'bytes');
        callback();
      },
      read() {
        // No-op for reading
      }
    });

    // Simulate some mock transcript results
    setTimeout(() => {
      onTranscript({
        transcript: "This is a mock transcript result.",
        isFinal: false,
        confidence: 0.85
      });
    }, 1000);

    setTimeout(() => {
      onTranscript({
        transcript: "This is a mock transcript result. The speech recognition is working.",
        isFinal: true,
        confidence: 0.92
      });
    }, 3000);

    this.recognizeStream = mockStream;
    return mockStream;
  }

  /**
   * Stop the current streaming session
   */
  stopStreaming(): void {
    if (this.recognizeStream) {
      this.recognizeStream.end();
      this.recognizeStream = null;
    }
  }
}
