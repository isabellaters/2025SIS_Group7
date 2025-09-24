import { windowsAudioCaptureService, AudioData } from './windows-audio-capture';
import { mockSpeechToTextService, MockTranscriptionResult } from './mock-speech-to-text';

export interface SpeechToTextConfig {
  captureMode: 'microphone' | 'window' | 'both';
  windowId?: string;
  transcriptionInterval: number; // milliseconds
  minAudioLength: number; // minimum audio length in seconds
  autoStart: boolean;
}

export interface SpeechToTextState {
  isRecording: boolean;
  isTranscribing: boolean;
  currentTranscript: string;
  allTranscripts: string[];
  lastTranscriptionTime: number;
  error: string | null;
  isInitialized: boolean;
}

export class SpeechToTextService {
  private config: SpeechToTextConfig;
  private state: SpeechToTextState;
  private transcriptionTimer: NodeJS.Timeout | null = null;
  private audioBuffer: AudioData[] = [];
  private listeners: ((state: SpeechToTextState) => void)[] = [];

  constructor(config: Partial<SpeechToTextConfig> = {}) {
    this.config = {
      captureMode: 'microphone',
      transcriptionInterval: 5000, // 5 seconds
      minAudioLength: 1, // 1 second
      autoStart: false,
      ...config
    };

    this.state = {
      isRecording: false,
      isTranscribing: false,
      currentTranscript: '',
      allTranscripts: [],
      lastTranscriptionTime: 0,
      error: null,
      isInitialized: false
    };
  }

  /**
   * Initialize the speech-to-text service
   * @returns Promise<boolean> - Success status
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if Google AI service is ready
      if (!mockSpeechToTextService.isReady()) {
        this.updateState({ 
          error: 'Speech-to-text service not initialized.',
          isInitialized: false 
        });
        return false;
      }

      this.updateState({ 
        isInitialized: true,
        error: null
      });

      console.log('Speech-to-text service initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing speech-to-text service:', error);
      this.updateState({ 
        error: 'Failed to initialize speech-to-text service',
        isInitialized: false 
      });
      return false;
    }
  }

  /**
   * Start speech-to-text transcription
   * @returns Promise<boolean> - Success status
   */
  async startTranscription(): Promise<boolean> {
    try {
      if (this.state.isRecording) {
        return true;
      }

      if (!this.state.isInitialized) {
        this.updateState({ error: 'Service not initialized. Please call initialize() first.' });
        return false;
      }

      // Start audio capture based on configuration
      let success = false;
      
      if (this.config.captureMode === 'microphone') {
        success = await windowsAudioCaptureService.startMicrophoneCapture((audioData) => {
          this.handleAudioData(audioData);
        });
      } else if (this.config.captureMode === 'window' && this.config.windowId) {
        success = await windowsAudioCaptureService.startWindowAudioCapture(
          this.config.windowId,
          (audioData) => {
            this.handleAudioData(audioData);
          }
        );
      } else {
        this.updateState({ error: 'Invalid capture mode or missing window ID' });
        return false;
      }

      if (!success) {
        this.updateState({ error: 'Failed to start audio capture' });
        return false;
      }

      this.updateState({ 
        isRecording: true, 
        error: null 
      });

      // Start transcription timer
      this.startTranscriptionTimer();

      console.log(`Started speech-to-text transcription (${this.config.captureMode})`);
      return true;
    } catch (error) {
      console.error('Error starting transcription:', error);
      this.updateState({ error: 'Failed to start transcription' });
      return false;
    }
  }

  /**
   * Stop speech-to-text transcription
   * @returns Promise<boolean> - Success status
   */
  async stopTranscription(): Promise<boolean> {
    try {
      if (!this.state.isRecording) {
        return true;
      }

      // Stop audio capture
      await windowsAudioCaptureService.stopCapture();

      // Clear transcription timer
      if (this.transcriptionTimer) {
        clearInterval(this.transcriptionTimer);
        this.transcriptionTimer = null;
      }

      // Process any remaining audio
      await this.processAudioBuffer();

      this.updateState({ 
        isRecording: false,
        isTranscribing: false
      });

      console.log('Stopped speech-to-text transcription');
      return true;
    } catch (error) {
      console.error('Error stopping transcription:', error);
      this.updateState({ error: 'Failed to stop transcription' });
      return false;
    }
  }

  /**
   * Pause transcription
   */
  pauseTranscription(): void {
    windowsAudioCaptureService.pauseCapture();
    this.updateState({ isRecording: false });
    console.log('Paused speech-to-text transcription');
  }

  /**
   * Resume transcription
   */
  resumeTranscription(): void {
    windowsAudioCaptureService.resumeCapture();
    this.updateState({ isRecording: true });
    console.log('Resumed speech-to-text transcription');
  }

  /**
   * Get current transcription state
   * @returns SpeechToTextState
   */
  getState(): SpeechToTextState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   * @param listener - Callback function for state updates
   * @returns Unsubscribe function
   */
  subscribe(listener: (state: SpeechToTextState) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Handle incoming audio data
   * @param audioData - Audio data from capture service
   */
  private handleAudioData(audioData: AudioData): void {
    this.audioBuffer.push(audioData);

    // Remove old audio data if buffer gets too large
    const maxBufferSize = this.config.minAudioLength * 1000; // Convert to milliseconds
    const now = Date.now();
    this.audioBuffer = this.audioBuffer.filter(
      data => now - data.timestamp < maxBufferSize
    );
  }

  /**
   * Start the transcription timer
   */
  private startTranscriptionTimer(): void {
    this.transcriptionTimer = setInterval(async () => {
      await this.processAudioBuffer();
    }, this.config.transcriptionInterval);
  }

  /**
   * Process accumulated audio buffer
   */
  private async processAudioBuffer(): Promise<void> {
    if (this.audioBuffer.length === 0 || this.state.isTranscribing) {
      return;
    }

    // Check if we have enough audio data
    const totalDuration = this.audioBuffer.reduce(
      (sum, data) => sum + data.duration, 
      0
    );

    if (totalDuration < this.config.minAudioLength) {
      return;
    }

    this.updateState({ isTranscribing: true });

    try {
      // Combine audio chunks
      const combinedBlob = await this.combineAudioChunks();

      // Transcribe audio using Google AI
      const result = await mockSpeechToTextService.transcribeAudio(
        combinedBlob, 
        this.audioBuffer[0].mimeType
      );

      if (result.text.trim()) {
        // Update current transcript
        const newTranscript = this.state.currentTranscript + ' ' + result.text;
        this.updateState({ 
          currentTranscript: newTranscript,
          allTranscripts: [...this.state.allTranscripts, result.text],
          lastTranscriptionTime: result.timestamp
        });

        // Output to console as requested
        console.log('🎤 Transcribed Text:', result.text);
        console.log('📝 Full Transcript:', newTranscript);

        // Clear processed audio buffer
        this.audioBuffer = [];
      }
    } catch (error) {
      console.error('Error processing audio buffer:', error);
      this.updateState({ error: 'Failed to process audio' });
    } finally {
      this.updateState({ isTranscribing: false });
    }
  }

  /**
   * Combine audio chunks into a single blob
   * @returns Promise<Blob>
   */
  private async combineAudioChunks(): Promise<Blob> {
    const blobs = this.audioBuffer.map(data => new Blob([data.data], { type: data.mimeType }));
    return new Blob(blobs, { type: this.audioBuffer[0].mimeType });
  }

  /**
   * Update state and notify listeners
   * @param updates - Partial state updates
   */
  private updateState(updates: Partial<SpeechToTextState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopTranscription();
    windowsAudioCaptureService.cleanup();
    this.listeners = [];
    console.log('Cleaned up speech-to-text service');
  }
}

// Export singleton instance
export const speechToTextService = new SpeechToTextService();
