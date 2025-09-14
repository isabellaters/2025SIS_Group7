import { desktopAudioCaptureService, DesktopAudioData } from './desktop-audio-capture';
import { googleAIService, TranscriptionResult } from './google-ai';
import { createTranscript, updateTranscript } from './transcripts';

export interface EnhancedTranscriptionConfig {
  autoStart: boolean;
  transcriptionInterval: number; // milliseconds
  minAudioLength: number; // minimum audio length in seconds
  maxAudioLength: number; // maximum audio length in seconds
  enableTranslation: boolean;
  targetLanguage?: string;
  includeSystemAudio: boolean;
}

export interface EnhancedTranscriptionState {
  isRecording: boolean;
  isTranscribing: boolean;
  currentTranscript: string;
  allTranscripts: string[];
  lastTranscriptionTime: number;
  error: string | null;
  availableSources: {desktop: boolean};
}

export class EnhancedLiveTranscriptionService {
  private config: EnhancedTranscriptionConfig;
  private state: EnhancedTranscriptionState;
  private transcriptionTimer: NodeJS.Timeout | null = null;
  private audioBuffer: DesktopAudioData[] = [];
  private currentTranscriptId: string | null = null;
  private listeners: ((state: EnhancedTranscriptionState) => void)[] = [];

  constructor(config: Partial<EnhancedTranscriptionConfig> = {}) {
    this.config = {
      autoStart: false,
      transcriptionInterval: 5000, // 5 seconds
      minAudioLength: 1, // 1 second
      maxAudioLength: 30, // 30 seconds
      enableTranslation: false,
      includeSystemAudio: true,
      ...config
    };

    this.state = {
      isRecording: false,
      isTranscribing: false,
      currentTranscript: '',
      allTranscripts: [],
      lastTranscriptionTime: 0,
      error: null,
      availableSources: {desktop: false}
    };
  }

  /**
   * Initialize the enhanced live transcription service
   * @returns Promise<boolean> - Success status
   */
  async initialize(): Promise<boolean> {
    try {
      // Check available audio sources
      const sources = await desktopAudioCaptureService.getAvailableSources();
      this.updateState({ availableSources: { desktop: sources.desktop } });

      // Initialize desktop audio capture
      const success = await desktopAudioCaptureService.initialize();

      if (!success) {
        this.updateState({ error: 'Failed to initialize desktop audio capture' });
        return false;
      }

      if (this.config.autoStart) {
        await this.startTranscription();
      }

      return true;
    } catch (error) {
      console.error('Error initializing enhanced live transcription:', error);
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
        title: `Desktop Audio Transcription - ${new Date().toLocaleString()}`,
        text: '',
        status: 'processing',
        createdAt: new Date() as any,
        updatedAt: new Date() as any
      });

      this.currentTranscriptId = transcriptId;

      // Start desktop audio recording
      const success = await desktopAudioCaptureService.startRecording((audioData) => {
        this.handleAudioData(audioData);
      });

      if (!success) {
        this.updateState({ error: 'Failed to start desktop audio recording' });
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

      // Stop desktop audio recording
      await desktopAudioCaptureService.stopRecording();

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
    desktopAudioCaptureService.pauseRecording();
    this.updateState({ isRecording: false });
  }

  /**
   * Resume transcription
   */
  resumeTranscription(): void {
    desktopAudioCaptureService.resumeRecording();
    this.updateState({ isRecording: true });
  }

  /**
   * Get current transcription state
   * @returns EnhancedTranscriptionState
   */
  getState(): EnhancedTranscriptionState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   * @param listener - Callback function for state updates
   * @returns Unsubscribe function
   */
  subscribe(listener: (state: EnhancedTranscriptionState) => void): () => void {
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
  private handleAudioData(audioData: DesktopAudioData): void {
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
      const base64Audio = await this.audioBlobToBase64(combinedBlob);

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
   * Update state and notify listeners
   * @param updates - Partial state updates
   */
  private updateState(updates: Partial<EnhancedTranscriptionState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopTranscription();
    desktopAudioCaptureService.cleanup();
    this.listeners = [];
  }
}

// Export singleton instance
export const enhancedLiveTranscriptionService = new EnhancedLiveTranscriptionService();
