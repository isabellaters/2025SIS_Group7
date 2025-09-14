export interface DesktopSource {
  id: string;
  name: string;
  thumbnail: string;
}

export interface ElectronDesktopAudioData {
  data: Blob;
  mimeType: string;
  timestamp: number;
  duration: number;
  source: string;
}

export interface ElectronDesktopCaptureConfig {
  sampleRate: number;
  channels: number;
  bufferSize: number;
  mimeType: string;
}

export class ElectronDesktopCaptureService {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private isRecording: boolean = false;
  private audioChunks: Blob[] = [];
  private config: ElectronDesktopCaptureConfig;
  private currentSource: DesktopSource | null = null;

  constructor(config: Partial<ElectronDesktopCaptureConfig> = {}) {
    this.config = {
      sampleRate: 16000,
      channels: 2,
      bufferSize: 4096,
      mimeType: 'audio/webm;codecs=opus',
      ...config
    };
  }

  /**
   * Get available desktop sources (screens and windows)
   * @returns Promise<DesktopSource[]>
   */
  async getDesktopSources(): Promise<DesktopSource[]> {
    try {
      if (!window.ipcRenderer) {
        throw new Error('Not running in Electron environment');
      }
      
      const sources = await window.ipcRenderer.getDesktopSources();
      return sources;
    } catch (error) {
      console.error('Error getting desktop sources:', error);
      throw error;
    }
  }

  /**
   * Initialize desktop capture with a specific source
   * @param sourceId - ID of the desktop source to capture
   * @returns Promise<boolean> - Success status
   */
  async initialize(sourceId: string): Promise<boolean> {
    try {
      if (!window.ipcRenderer) {
        throw new Error('Not running in Electron environment');
      }

      // Get source info
      const sourceInfo = await window.ipcRenderer.startDesktopCapture(sourceId);
      this.currentSource = {
        id: sourceInfo.id,
        name: sourceInfo.name,
        thumbnail: ''
      };

      // Create MediaStream using Electron's desktop capture
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
          }
        } as any
      });

      // Create media recorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.config.mimeType
      });

      return true;
    } catch (error) {
      console.error('Error initializing Electron desktop capture:', error);
      return false;
    }
  }

  /**
   * Start recording desktop audio
   * @param onDataCallback - Callback for audio data chunks
   * @returns Promise<boolean> - Success status
   */
  async startRecording(onDataCallback?: (audioData: ElectronDesktopAudioData) => void): Promise<boolean> {
    if (!this.mediaRecorder || this.isRecording) {
      return false;
    }

    try {
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          
          const audioData: ElectronDesktopAudioData = {
            data: event.data,
            mimeType: this.config.mimeType,
            timestamp: Date.now(),
            duration: event.data.size / (this.config.sampleRate * this.config.channels * 2),
            source: this.currentSource?.id || 'unknown'
          };
          
          if (onDataCallback) {
            onDataCallback(audioData);
          }
        }
      };

      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;
      return true;
    } catch (error) {
      console.error('Error starting Electron desktop recording:', error);
      return false;
    }
  }

  /**
   * Stop recording desktop audio
   * @returns Promise<Blob | null> - Final audio blob or null if failed
   */
  async stopRecording(): Promise<Blob | null> {
    if (!this.mediaRecorder || !this.isRecording) {
      return null;
    }

    try {
      return new Promise((resolve) => {
        this.mediaRecorder!.onstop = () => {
          const audioBlob = new Blob(this.audioChunks, { type: this.config.mimeType });
          this.isRecording = false;
          resolve(audioBlob);
        };
        
        this.mediaRecorder!.stop();
      });
    } catch (error) {
      console.error('Error stopping Electron desktop recording:', error);
      return null;
    }
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.pause();
    }
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.resume();
    }
  }

  /**
   * Get current recording status
   * @returns boolean
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get current source info
   * @returns DesktopSource | null
   */
  getCurrentSource(): DesktopSource | null {
    return this.currentSource;
  }

  /**
   * Convert audio blob to base64 string
   * @param audioBlob - Audio blob to convert
   * @returns Promise<string> - Base64 encoded audio data
   */
  async audioBlobToBase64(audioBlob: Blob): Promise<string> {
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
   * Clean up resources
   */
  cleanup(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.isRecording = false;
    this.audioChunks = [];
    this.currentSource = null;
  }
}

// Export singleton instance
export const electronDesktopCaptureService = new ElectronDesktopCaptureService();
