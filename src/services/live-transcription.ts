import { audioCaptureService, AudioData } from './audio-capture';
import { googleAIService, TranscriptionResult } from './google-ai';
import { createTranscript, updateTranscript } from './transcripts';

export interface LiveTranscriptionConfig {
  autoStart: boolean;
  transcriptionInterval: number; // milliseconds
  minAudioLength: number; // minimum audio length in seconds
  maxAudioLength: number; // maximum audio length in seconds
  enableTranslation: boolean;
  targetLanguage?: string;
}

export interface LiveTranscriptionState {
  isRecording: boolean;
  isTranscribing: boolean;
  currentTranscript: string;
  allTranscripts: string[];
  lastTranscriptionTime: number;
  error: string | null;
}

export class LiveTranscriptionService {
  private config: LiveTranscriptionConfig;
  private state: LiveTranscriptionState;
  private transcriptionTimer: NodeJS.Timeout | null = null;
  private audioBuffer: AudioData[] = [];
  private currentTranscriptId: string | null = null;
  private listeners: ((state: LiveTranscriptionState) => void)[] = [];

  constructor(config: Partial<LiveTranscriptionConfig> = {}) {
    this.config = {
      autoStart: false,
      transcriptionInterval: 5000, // 5 seconds
      minAudioLength: 1, // 1 second
      maxAudioLength: 30, // 30 seconds
      enableTranslation: false,
      ...config
    };

    this.state = {
      isRecording: false,
      isTranscribing: false,
      currentTranscript: '',
      allTranscripts: [],
      lastTranscriptionTime: 0,
      error: null
    };
  }

  /**
   * Initialize the live transcription service
   * @returns Promise<boolean> - Success status
   */
  async initialize(): Promise<boolean> {
    try {
      const success = await audioCaptureService.initialize();
      if (!success) {
        this.updateState({ error: 'Failed to initialize audio capture' });
        return false;
      }

      if (this.config.autoStart) {
        await this.startTranscription();
      }

      return true;
    } catch (error) {
      console.error('Error initializing live transcription:', error);
      this.updateState({ error: 'Failed to initialize live transcription service' });
      return false;
    }
  }

  /**
   * Start live transcription
   * @returns Promise<boolean> - Success status
   */
  async startTranscription(): Promise<boolean> {
    try {
      if (this.state.isRecording) {
        return true;
      }

      // Create a new transcript record
      const transcriptId = await createTranscript({
        title: `Live Transcription - ${new Date().toLocaleString()}`,
        text: '',
        status: 'processing',
        createdAt: new Date() as any,
        updatedAt: new Date() as any
      });

      this.currentTranscriptId = transcriptId;

      // Start audio recording
      const success = await audioCaptureService.startRecording((audioData) => {
        this.handleAudioData(audioData);
      });

      if (!success) {
        this.updateState({ error: 'Failed to start audio recording' });
        return false;
      }

      this.updateState({ 
        isRecording: true, 
        error: null 
      });

      // Start transcription timer
      this.startTranscriptionTimer();

      return true;
    } catch (error) {
      console.error('Error starting transcription:', error);
      this.updateState({ error: 'Failed to start transcription' });
      return false;
    }
  }

  /**
   * Stop live transcription
   * @returns Promise<boolean> - Success status
   */
  async stopTranscription(): Promise<boolean> {
    try {
      if (!this.state.isRecording) {
        return true;
      }

      // Stop audio recording
      await audioCaptureService.stopRecording();

      // Clear transcription timer
      if (this.transcriptionTimer) {
        clearInterval(this.transcriptionTimer);
        this.transcriptionTimer = null;
      }

      // Process any remaining audio
      await this.processAudioBuffer();

      // Update final transcript
      if (this.currentTranscriptId) {
        await updateTranscript(this.currentTranscriptId, {
          text: this.state.allTranscripts.join(' '),
          status: 'completed',
          updatedAt: new Date() as any
        });
      }

      this.updateState({ 
        isRecording: false,
        isTranscribing: false
      });

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
    audioCaptureService.pauseRecording();
    this.updateState({ isRecording: false });
  }

  /**
   * Resume transcription
   */
  resumeTranscription(): void {
    audioCaptureService.resumeRecording();
    this.updateState({ isRecording: true });
  }

  /**
   * Get current transcription state
   * @returns LiveTranscriptionState
   */
  getState(): LiveTranscriptionState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   * @param listener - Callback function for state updates
   * @returns Unsubscribe function
   */
  subscribe(listener: (state: LiveTranscriptionState) => void): () => void {
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
    const maxBufferSize = this.config.maxAudioLength * 1000; // Convert to milliseconds
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
      const base64Audio = await audioCaptureService.audioBlobToBase64(combinedBlob);

      // Transcribe audio
      const result = await googleAIService.transcribeAudio(
        base64Audio, 
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

        // Update database
        if (this.currentTranscriptId) {
          await updateTranscript(this.currentTranscriptId, {
            text: newTranscript,
            updatedAt: new Date() as any
          });
        }

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
  private updateState(updates: Partial<LiveTranscriptionState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopTranscription();
    audioCaptureService.cleanup();
    this.listeners = [];
  }
}

// Export singleton instance
export const liveTranscriptionService = new LiveTranscriptionService();
