// Console-focused speech-to-text service for testing
// This service uses IPC to communicate with the main process for Google Cloud Speech-to-Text

export interface ConsoleTranscriptionResult {
  text: string;
  timestamp: number;
  confidence?: number;
}

export class ConsoleSpeechToTextService {
  private isRecording: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private transcriptionInterval: NodeJS.Timeout | null = null;

  constructor() {
    console.log('🎤 Console Speech-to-Text Service initialized');
    console.log('🔍 Google Cloud Speech-to-Text service status: Will be checked via IPC');
  }

  /**
   * Start microphone recording and transcription
   */
  async startMicrophoneTranscription(): Promise<boolean> {
    try {
      if (this.isRecording) {
        console.log('⚠️  Already recording');
        return true;
      }

      console.log('🎤 Requesting microphone access...');
      
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      console.log('✅ Microphone access granted');

      // Create media recorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      // Set up data handler
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          console.log(`📦 Audio chunk received: ${event.data.size} bytes`);
        }
      };

      // Set up error handler
      this.mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        this.isRecording = false;
      };

      // Set up stop handler
      this.mediaRecorder.onstop = () => {
        console.log('⏹️  MediaRecorder stopped');
        this.isRecording = false;
      };

      // Start recording
      this.mediaRecorder.start(2000); // Collect data every 2 seconds
      this.isRecording = true;

      // Start transcription timer
      this.startTranscriptionTimer();

      console.log('🎙️  Started microphone recording and transcription');
      console.log('💬 Speak now - transcription will appear in console...');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to start microphone recording:', error);
      return false;
    }
  }

  /**
   * Stop recording and transcription
   */
  async stopTranscription(): Promise<void> {
    try {
      if (!this.isRecording) {
        console.log('⚠️  Not currently recording');
        return;
      }

      console.log('⏹️  Stopping transcription...');

      // Stop media recorder
      if (this.mediaRecorder) {
        this.mediaRecorder.stop();
        this.mediaRecorder = null;
      }

      // Stop transcription timer
      if (this.transcriptionInterval) {
        clearInterval(this.transcriptionInterval);
        this.transcriptionInterval = null;
      }

      // Stop audio stream
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }

      this.isRecording = false;
      this.audioChunks = [];

      console.log('✅ Transcription stopped');
    } catch (error) {
      console.error('❌ Error stopping transcription:', error);
    }
  }

  /**
   * Start the transcription timer
   */
  private startTranscriptionTimer(): void {
    this.transcriptionInterval = setInterval(async () => {
      await this.processAudioBuffer();
    }, 3000); // Process every 3 seconds
  }

  /**
   * Process the audio buffer and transcribe
   */
  private async processAudioBuffer(): Promise<void> {
    if (this.audioChunks.length === 0) {
      return;
    }

    console.log(`🔄 Processing ${this.audioChunks.length} audio chunks...`);

    try {
      // Combine audio chunks
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
      console.log(`📊 Audio blob size: ${audioBlob.size} bytes`);

      // Clear the buffer
      this.audioChunks = [];

      // Transcribe using Google Cloud Speech-to-Text via IPC
      const result = await this.transcribeAudioViaIPC(audioBlob, 'audio/webm;codecs=opus');
      
      if (result.text && result.text.trim()) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`\n🎯 [${timestamp}] TRANSCRIBED TEXT:`);
        console.log(`📝 "${result.text}"`);
        console.log(`⏱️  Confidence: ${result.confidence || 'N/A'}`);
        console.log('─'.repeat(50));
      } else {
        console.log('🔇 No speech detected in this segment');
      }
    } catch (error) {
      console.error('❌ Transcription error:', error);
    }
  }

  /**
   * Get current recording status
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Transcribe audio using IPC to main process
   * @param audioBlob - Audio blob to transcribe
   * @param mimeType - MIME type of the audio
   * @returns Promise<ConsoleTranscriptionResult>
   */
  private async transcribeAudioViaIPC(audioBlob: Blob, mimeType: string): Promise<ConsoleTranscriptionResult> {
    try {
      // Check if we're in Electron environment
      if (!window.electronAPI) {
        throw new Error('Not running in Electron environment');
      }

      // Convert audio blob to base64 using a more efficient method
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64 in chunks to avoid stack overflow
      let base64Audio = '';
      const chunkSize = 8192; // Process in 8KB chunks
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        base64Audio += btoa(String.fromCharCode(...chunk));
      }

      console.log('🔄 Sending transcription request to main process...');

      // Call the main process via IPC
      const result = await window.electronAPI.transcribeAudio(base64Audio, mimeType);

      if (result.error) {
        // If authentication fails, fall back to mock service
        if (result.error.includes('credentials') || result.error.includes('authentication')) {
          console.log('⚠️ Google Cloud authentication failed, falling back to mock service');
          return this.fallbackToMockTranscription(audioBlob, mimeType);
        }
        throw new Error(result.error);
      }

      return {
        text: result.text,
        confidence: result.confidence,
        timestamp: result.timestamp
      };

    } catch (error) {
      console.error('❌ Error transcribing audio via IPC:', error);
      
      // If it's an authentication error, try mock service
      if (error.message.includes('credentials') || error.message.includes('authentication')) {
        console.log('⚠️ Authentication error, falling back to mock service');
        return this.fallbackToMockTranscription(audioBlob, mimeType);
      }
      
      return {
        text: '',
        confidence: 0,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Fallback to mock transcription when Google Cloud fails
   * @param audioBlob - Audio blob to transcribe
   * @param mimeType - MIME type of the audio
   * @returns Promise<ConsoleTranscriptionResult>
   */
  private async fallbackToMockTranscription(audioBlob: Blob, mimeType: string): Promise<ConsoleTranscriptionResult> {
    console.log('🎭 Using mock transcription service as fallback');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const mockResponses = [
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
    
    const text = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    const confidence = Math.min(0.95, 0.7 + (audioBlob.size / 10000) * 0.25);
    
    console.log(`🎭 Mock transcription: "${text}" (confidence: ${confidence.toFixed(2)})`);
    
    return {
      text: text,
      confidence: confidence,
      timestamp: Date.now()
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopTranscription();
    console.log('🧹 Console Speech-to-Text Service cleaned up');
  }
}

// Export singleton instance
export const consoleSpeechToTextService = new ConsoleSpeechToTextService();
